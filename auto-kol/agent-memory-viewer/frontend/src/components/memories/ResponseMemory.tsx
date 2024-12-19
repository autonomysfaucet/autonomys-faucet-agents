import { Text, VStack, Link, Box } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { ResponseMemory } from '../../types'
import { ResponseStatus } from '../../types/enums'
import { getStatusColor } from '../../utils/statusColors'

interface Props {
    memory: ResponseMemory;
}

export function ResponseMemoryView({ memory }: Props) {
    return (
        <>
            <Text fontSize="md" fontWeight="bold" color="purple.400" mb={2}>
                Response
            </Text>
            <VStack align="stretch" mb={4} pl={4}>
                <Text>
                    <Text as="span" color="gray.400">Content:</Text>{' '}
                    <Text as="span" color="white">{memory.response}</Text>
                </Text>
            </VStack>

            <Text fontSize="md" fontWeight="bold" color="purple.400" mb={2}>
                Tone Analysis
            </Text>
            <VStack align="stretch" mb={4} pl={4}>
                <Text>
                    <Text as="span" color="gray.400">Dominant Tone:</Text>{' '}
                    <Text as="span" color="orange.400">{memory.workflowState.toneAnalysis.dominantTone}</Text>
                </Text>
                <Text>
                    <Text as="span" color="gray.400">Suggested Tone:</Text>{' '}
                    <Text as="span" color="orange.400">{memory.workflowState.toneAnalysis.suggestedTone}</Text>
                </Text>
                <Text>
                    <Text as="span" color="gray.400">Reasoning:</Text>{' '}
                    <Text as="span" color="white">{memory.workflowState.toneAnalysis.reasoning}</Text>
                </Text>
            </VStack>

            <Text fontSize="md" fontWeight="bold" color="purple.400" mb={2}>
                Response Strategy
            </Text>
            <VStack align="stretch" mb={4} pl={4}>
                <Text>
                    <Text as="span" color="gray.400">Tone:</Text>{' '}
                    <Text as="span" color="orange.400">{memory.workflowState.responseStrategy.tone}</Text>
                </Text>
                <Text>
                    <Text as="span" color="gray.400">Strategy:</Text>{' '}
                    <Text as="span" color="white">{memory.workflowState.responseStrategy.strategy}</Text>
                </Text>
                <Text>
                    <Text as="span" color="gray.400">Confidence:</Text>{' '}
                    <Text as="span" color="green.400">
                        {(memory.workflowState.responseStrategy.confidence * 100).toFixed(1)}%
                    </Text>
                </Text>
            </VStack>

            {memory.workflowState.responseStrategy.referencedTweets.length > 0 && (
                <>
                    <Text fontSize="md" fontWeight="bold" color="purple.400" mb={2}>
                        Referenced Tweets
                    </Text>
                    <VStack align="stretch" mb={4} pl={4}>
                        {memory.workflowState.responseStrategy.referencedTweets.map((tweet, index) => (
                            <Box 
                                key={index} 
                                p={2} 
                                border="1px solid" 
                                borderColor="gray.600" 
                                borderRadius="md"
                            >
                                <Text color="white" mb={2}>{tweet.text}</Text>
                                <Text fontSize="sm" color="gray.400">Reason: {tweet.reason}</Text>
                                <Text fontSize="sm" color="gray.400">
                                    Similarity: {(tweet.similarity_score * 100).toFixed(1)}%
                                </Text>
                            </Box>
                        ))}
                    </VStack>
                </>
            )}

            <Text fontSize="md" fontWeight="bold" color="purple.400" mb={2}>
                Memory Status
            </Text>
            <VStack align="stretch" mb={4} pl={4}>
                <Text>
                    <Text as="span" color="gray.400">Type:</Text>{' '}
                    <Text as="span" color={getStatusColor(memory.type as ResponseStatus)}>
                        {memory.type.charAt(0).toUpperCase() + memory.type.slice(1)}
                    </Text>
                </Text>
            </VStack>

            <Text fontSize="md" fontWeight="bold" color="purple.400" mb={2}>
                Additional Information
            </Text>
            <VStack align="stretch" pl={4}>
                <Text>
                    <Text as="span" color="gray.400">Previous CID:</Text>{' '}
                    {memory.previousCid ? (
                        <Link
                            as={RouterLink}
                            to={`/memory/${memory.previousCid}`}
                            color="blue.400"
                            _hover={{ color: 'blue.300' }}
                        >
                            {memory.previousCid}
                        </Link>
                    ) : (
                        <Text as="span" color="white">None</Text>
                    )}
                </Text>
                <Text>
                    <Text as="span" color="gray.400">Timestamp:</Text>{' '}
                    <Text as="span" color="white">{new Date(memory.timestamp).toLocaleString()}</Text>
                </Text>
            </VStack>

            <Text fontSize="md" fontWeight="bold" color="purple.400" mb={2}>
                Signature
            </Text>
            <VStack align="stretch" mb={4} pl={4}>
                <Text>
                    <Text as="span" color="gray.400">Value:</Text>{' '}
                    <Text as="span" color="white" fontSize="sm" wordBreak="break-all">
                        {memory.signature}
                    </Text>
                </Text>
            </VStack>

            {memory.mentions && memory.mentions.length > 0 && (
                <>
                    <Text fontSize="md" fontWeight="bold" color="purple.400" mb={2}>
                        Conversation Thread
                    </Text>
                    <VStack align="stretch" mb={4} pl={4}>
                        {memory.mentions.map((mention) => (
                            <VStack 
                                key={mention.id} 
                                p={2} 
                                border="1px solid" 
                                borderColor="gray.600" 
                                borderRadius="md"
                                align="stretch"
                            >
                                <Text>
                                    <Text as="span" color="gray.400">@{mention.author_username}:</Text>{' '}
                                    <Text as="span" color="white">{mention.text}</Text>
                                </Text>
                                <Text fontSize="sm" color="gray.400">
                                    {new Date(mention.created_at).toLocaleString()}
                                </Text>
                            </VStack>
                        ))}
                    </VStack>
                </>
            )}
        </>
    );
} 