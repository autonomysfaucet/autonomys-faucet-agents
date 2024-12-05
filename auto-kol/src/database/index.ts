import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Database } from 'sqlite/build/Database';
import fs from 'fs/promises';
import path from 'path';
import { v4 as generateId } from 'uuid';
import { createLogger } from '../utils/logger';

const logger = createLogger('database');

export interface PendingResponse {
    id: string;
    tweetId: string;
    content: string;
    tone: string;
    strategy: string;
    estimatedImpact: number;
    confidence: number;
}

let db: Database | null = null;

export async function initializeDatabase() {
    if (!db) {
        try {
            const dbDir = path.dirname('./data/engagement.db');
            await fs.mkdir(dbDir, { recursive: true });

            db = await open({
                filename: './data/engagement.db',
                driver: sqlite3.Database
            });
            
            await db.run('PRAGMA foreign_keys = ON');
            
            // Test database connection
            await db.get('SELECT 1');
        } catch (error) {
            db = null;
            throw new Error(`Failed to initialize database: ${error}`);
        }
    }
    return db;
}

export async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
    }
}

export async function addPendingResponse(response: PendingResponse) {
    const db = await initializeDatabase();
    return db.run(`
        INSERT INTO pending_responses (
            id, tweet_id, content, tone, strategy, 
            estimated_impact, confidence, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        response.id,
        response.tweetId,
        response.content,
        response.tone,
        response.strategy,
        response.estimatedImpact,
        response.confidence,
        'pending'
    ]);
}

export async function getPendingResponses() {
    const db = await initializeDatabase();
    return db.all(`
        SELECT 
            pr.*,
            t.author_username,
            t.content as tweet_content
        FROM pending_responses pr
        JOIN tweets t ON pr.tweet_id = t.id
        WHERE pr.status = 'pending'
        ORDER BY pr.created_at DESC
    `);
}

export async function updateResponseStatus(
    responseId: string, 
    status: 'approved' | 'rejected',
    feedback?: string
) {
    const db = await initializeDatabase();
    
    await db.run('BEGIN TRANSACTION');
    
    try {
        await db.run(`
            UPDATE pending_responses 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, responseId]);

        if (feedback) {
            await db.run(`
                INSERT INTO feedback (
                    id, response_id, feedback_type, feedback_content
                ) VALUES (?, ?, ?, ?)
            `, [
                generateId(),
                responseId,
                status === 'approved' ? 'approve' : 'reject',
                feedback
            ]);
        }

        await db.run('COMMIT');
    } catch (error) {
        await db.run('ROLLBACK');
        throw error;
    }
}

export async function addTweet(tweet: {
    id: string;
    authorId: string;
    authorUsername: string;
    content: string;
    createdAt: string;
}) {
    const db = await initializeDatabase();
    return db.run(`
        INSERT INTO tweets (
            id, author_id, author_username, content, 
            created_at, engagement_status
        ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
        tweet.id,
        tweet.authorId,
        tweet.authorUsername,
        tweet.content,
        tweet.createdAt,
        'pending'
    ]);
}

export async function addSkippedTweet(skipped: {
    id: string;
    tweetId: string;
    reason: string;
    confidence: number;
}) {
    const db = await initializeDatabase();
    return db.run(`
        INSERT INTO skipped_tweets (
            id, tweet_id, reason, confidence
        ) VALUES (?, ?, ?, ?)
    `, [
        skipped.id,
        skipped.tweetId,
        skipped.reason,
        skipped.confidence
    ]);
}

export async function getSkippedTweets() {
    const db = await initializeDatabase();
    return db.all(`
        SELECT 
            st.*,
            t.author_username,
            t.content as tweet_content
        FROM skipped_tweets st
        JOIN tweets t ON st.tweet_id = t.id
        ORDER BY st.created_at DESC
    `);
}

export async function addSentResponse(sent: {
    id: string;
    tweetId: string;
    responseId: string;
    engagementMetrics?: string;
}) {
    const db = await initializeDatabase();
    return db.run(`
        INSERT INTO sent_responses (
            id, tweet_id, response_id, engagement_metrics
        ) VALUES (?, ?, ?, ?)
    `, [
        sent.id,
        sent.tweetId,
        sent.responseId,
        sent.engagementMetrics
    ]);
}

export async function updateTweetEngagementStatus(
    tweetId: string,
    status: 'pending' | 'engaged' | 'skipped'
) {
    const db = await initializeDatabase();
    return db.run(`
        UPDATE tweets 
        SET engagement_status = ?
        WHERE id = ?
    `, [status, tweetId]);
}

export async function initializeSchema() {
    const db = await initializeDatabase();
    
    try {
        await db.run('BEGIN TRANSACTION');

        // Check if tables exist first
        const tables = await db.all(`
            SELECT name 
            FROM sqlite_master 
            WHERE type='table' AND name IN (
                'tweets', 
                'pending_responses', 
                'skipped_tweets', 
                'sent_responses', 
                'feedback',
                'kor_accounts'
            )
        `);

        const existingTables = new Set(tables.map(t => t.name));

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf-8');

        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?([^\s(]+)/i)?.[1];
            if (tableName && !existingTables.has(tableName)) {
                await db.run(statement);
                logger.info(`Created table: ${tableName}`);
            }
        }

        await db.run('COMMIT');
        logger.info('Schema initialization completed successfully');
    } catch (error) {
        await db.run('ROLLBACK');
        logger.error('Failed to initialize schema:', error);
        throw new Error(`Failed to initialize schema: ${error}`);
    }
} 


// HELPER FUNCTIONS
export async function getLatestTweetTimestampByAuthor(authorUsername: string): Promise<string | null> {
    const db = await initializeDatabase();
    const result = await db.get(`
        SELECT created_at 
        FROM tweets 
        WHERE author_username = ?
        ORDER BY created_at DESC 
        LIMIT 1
    `, [authorUsername]);
    return result?.created_at || null;
}