import { ethers, Contract } from 'ethers';
import { MEMORY_ABI } from '../abi/memory.js';
import { config } from '../config/index.js';
import { wallet } from './agentWallet.js';
import { cidFromBlakeHash } from '@autonomys/auto-dag-data';
import { createLogger } from './logger.js';

const logger = createLogger('agentMemoryContract');

const CONTRACT_ADDRESS = config.CONTRACT_ADDRESS as `0x${string}`;
const contract = new Contract(CONTRACT_ADDRESS, MEMORY_ABI, wallet);

function hashToCid(hash: Uint8Array): string {
    const cid = cidFromBlakeHash(Buffer.from(hash));
    return cid.toString();
}

export async function getLastMemoryHash(): Promise<string> {
    const hash = await contract.getLastMemoryHash(config.AGENT_ADDRESS);
    return hashToCid(ethers.getBytes(hash));
}

export async function watchMemoryHashUpdates(
    callback: (agent: string, cid: string) => void
) {
    const agentAddress = config.AGENT_ADDRESS.toLowerCase();
    let isWatching = true;
    let refreshInterval: NodeJS.Timeout | null = null;
    let listener: ((agent: string, hash: string) => void) | null = null;
    const eventName = 'LastMemoryHashSet';

    logger.info('Setting up memory hash watcher', {
        agentAddress,
        contractAddress: CONTRACT_ADDRESS,
    });

    const cleanupListener = async () => {
        if (!listener) return;

        try {
            contract.off(eventName, listener);
            logger.info('Listener successfully removed');
        } catch (error) {
            logger.debug('Failed to remove listener (expected on reconnection)', { 
                error 
            });
        }

        listener = null;

        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }

        if (contract.runner?.provider) {
            contract.runner.provider.removeAllListeners('error');
        }
    };

    const setupListener = async () => {
        if (!isWatching) return;

        // Cleanup any existing listeners
        await cleanupListener();

        // Define the event listener logic
        listener = (agent, hash) => {
            if (!isWatching) return;

            try {
                const cid = hashToCid(ethers.getBytes(hash));
                if (agent.toLowerCase() === agentAddress) {
                    callback(agent, cid);
                }
            } catch (error) {
                logger.error('Error processing event data', { error });
            }
        };

        // Attach the listener to the contract
        logger.info('Attaching event listener for LastMemoryHashSet');
        contract.on(eventName, listener);

        if (contract.runner?.provider) {
            const provider = contract.runner.provider;

            provider.on('error', async (error) => {
                logger.error('Provider error, attempting to reconnect...', { error });

                if (isWatching) {
                    await cleanupListener();
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    await setupListener();
                }
            });

            // Clear any existing refresh interval
            if (refreshInterval) clearInterval(refreshInterval);

            // Set up new refresh interval to refresh the listener every 4 minutes
            refreshInterval = setInterval(async () => {
                if (!isWatching) {
                    if (refreshInterval) clearInterval(refreshInterval);
                    return;
                }

                try {
                    logger.debug('Refreshing event listener');
                    await setupListener();
                } catch (error) {
                    logger.error('Error refreshing listener', { error });
                }
            }, 4 * 60 * 1000); // Refresh every 4 minutes
        } else {
            logger.warn('Runner or provider is null, reconnection logic may not work.');
        }
    };

    // Start the listener setup
    await setupListener();

    return async () => {
        isWatching = false;
        
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }

        await cleanupListener();
        
        // Remove any remaining provider listeners
        if (contract.runner?.provider) {
            contract.runner.provider.removeAllListeners('error');
        }

        logger.info('Memory hash watcher stopped.');
    };
}
