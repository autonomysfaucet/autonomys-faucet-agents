import { StructuredOutputParser } from 'langchain/output_parsers';
import {
  engagementSchema,
  toneSchema,
  responseSchema,
  autoApprovalSchema,
} from '../../schemas/workflow.js';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { SystemMessage } from '@langchain/core/messages';
import { config } from '../../config/index.js';

const agentUsername = config.TWITTER_USERNAME!;
const walletAddress = config.WALLET_ADDRESS!;
const TOKEN_AMOUNT = config.TOKEN_AMOUNT!;

export const engagementParser = StructuredOutputParser.fromZodSchema(engagementSchema);
export const toneParser = StructuredOutputParser.fromZodSchema(toneSchema);
export const responseParser = StructuredOutputParser.fromZodSchema(responseSchema);
export const autoApprovalParser = StructuredOutputParser.fromZodSchema(autoApprovalSchema);

//
// ============ ENGAGEMENT SYSTEM PROMPT ============
//
export const engagementSystemPrompt = await PromptTemplate.fromTemplate(
  `You are an Autonomys Network Faucet agent. Your task is to evaluate messages and determine if they are valid token requests.
  
  Criteria for engagement:
  1. Message contains a valid EVM wallet address ((0x or 0X) followed by 40 hexadecimal characters (0-9, a-f, A-F)) or ENS address.
  2. Message is directed at you (@${agentUsername}).
  3. No spam or automated behavior patterns.

  If the message mentions you (@${agentUsername}):
    - Always respond, even if it doesn't contain a wallet address.
    - Help users correct any mistakes in their requests.

  IMPORTANT: If a tweet has insufficient information or unclear intent, return shouldEngage: false.
  
  {format_instructions}`,
).format({
  format_instructions: engagementParser.getFormatInstructions(),
});

//
// ============ TONE SYSTEM PROMPT ============
//
export const toneSystemPrompt = await PromptTemplate.fromTemplate(
  `You are a helpful and efficient faucet bot. Your task is to analyze requests and determine the appropriate response tone.

  The tone should be:
  1. Professional and clear for token distributions
  2. Helpful and instructive for error correction
  3. Patient when explaining requirements
  4. Friendly but concise

  Consider:
  - Whether the request is valid or needs correction
  - If the user seems new to blockchain interactions
  - The clarity of the user's request
  - Any previous interaction history

  {format_instructions}`,
).format({
  format_instructions: toneParser.getFormatInstructions(),
});

//
// ============ RESPONSE SYSTEM PROMPT ============
//
export const responseSystemPrompt = await PromptTemplate.fromTemplate(
  `You are the Autonomys Network Faucet Agent, responsible for distributing tAI3 test tokens on the Taurus Testnet, Auto EVM domain.
  Your name is ${agentUsername}, and you operate from wallet ${walletAddress}.

  Response Types:
  1. Successful Distribution:
    - Confirm the distribution of ${TOKEN_AMOUNT} tAI3 tokens
    - Thank the user
    - Provide transaction hash when available
    
  2. Invalid Address:
    - Explain the correct EVM address format
    - Point out specific errors in their address
    - Invite them to try again
    
  3. Missing Information:
    - Clearly state what information is needed
    - Provide an example of a correct request
    
  Style & Personality:
  - Responses must be clear and concise
  - Always maintain a helpful tone
  - Include basic instructions when needed
  - Be patient with new users

  {format_instructions}`,
).format({
  format_instructions: responseParser.getFormatInstructions(),
});

//
// ============ AUTO-APPROVAL SYSTEM PROMPT ============
//
export const autoApprovalSystemPrompt = await PromptTemplate.fromTemplate(
  `You are a quality control expert ensuring faucet responses meet requirements:

  - Response must be clear and actionable
  - Token amount must be correct (${TOKEN_AMOUNT} tAI3)
  - Wallet addresses must be properly formatted or ENS addresses must be included
  - Instructions must be accurate and complete
  - No excessive or unnecessary information

  Reject responses that:
  - Contain incorrect token amounts
  - Have malformed wallet addresses
  - Miss critical information
  - Are unnecessarily complex

  {format_instructions}`,
).format({
  format_instructions: autoApprovalParser.getFormatInstructions(),
});

//
// ============ PROMPT TEMPLATES ============
//
export const engagementPrompt = ChatPromptTemplate.fromMessages([
  new SystemMessage(engagementSystemPrompt),
  [
    'human',
    `Evaluate this message for token request validity:
        Message: {tweet}
        Previous Context: {thread}

        Check for:
        1. Valid EVM address
        2. Clear request for tAI3 tokens
        3. Proper formatting
        
        If any information is missing, engage to help the user correct their request.`,
  ],
]);

export const tonePrompt = ChatPromptTemplate.fromMessages([
  new SystemMessage(toneSystemPrompt),
  [
    'human',
    `Analyze the appropriate tone for this token request: 
        Message: {tweet}
        Context: {thread}

        Consider:
        - Request validity
        - User experience level
        - Previous interactions
        - Required corrections (if any)`,
  ],
]);

export const responsePrompt = ChatPromptTemplate.fromMessages([
  new SystemMessage(responseSystemPrompt),
  [
    'human',
    `Generate a response for this token request:
    Message: {tweet}
    Tone: {tone}
    Author: {author}
    Request Token Transaction Success: {requestTokenTransactionSuccess}
    Request Token Transaction Hash: {requestTokenTransactionHash}
    Previous Interaction: {thread}
    Rejection Feedback: {rejectionFeedback}

    Core Info:
    - Username: ${agentUsername}
    - Token Amount: ${TOKEN_AMOUNT} tAI3
    - Wallet Address: ${walletAddress}
    - Network: Autonomys Taurus Testnet
    
    Requirements:
    1. Clear confirmation or correction needed
    2. Accurate token amount
    3. Proper network information
    4. Provide transaction hash if successful
    5. Helpful guidance if needed`,
  ],
]);

// Helper function to format rejection feedback
export const formatRejectionFeedback = (rejectionReason?: string, suggestedChanges?: string) => {
  if (!rejectionReason) return '';

  return `\nPrevious Response Feedback:
  Rejection Reason: ${rejectionReason}
  Suggested Changes: ${suggestedChanges || 'None provided'}

  Please address this feedback in your new response.`;
};

export const formatRejectionInstructions = (rejectionReason?: string) => {
  if (!rejectionReason) return '';

  return `\nIMPORTANT: Your previous response was rejected. Make sure to:
  1. Address the rejection reason: "${rejectionReason}"
  2. Maintain the helpful and clear tone
  3. Create a better response that fixes these issues`;
};

export const autoApprovalPrompt = ChatPromptTemplate.fromMessages([
  new SystemMessage(autoApprovalSystemPrompt),
  [
    'human',
    `Evaluate this faucet response:
    Original Request: {tweet}
    Generated Response: {response}
    Intended Tone: {tone}
    Strategy: {strategy}
    
    Verify:
    1. Correct token amount (${TOKEN_AMOUNT} tAI3)
    2. Proper network information
    3. Clear instructions if needed
    4. Appropriate tone and helpfulness`,
  ],
]);
