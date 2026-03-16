# Friends Group Chat

## Current State
New project with no existing features.

## Requested Changes (Diff)

### Add
- Group chat room where multiple users can send and read messages
- User nickname setup on first visit (stored locally)
- Real-time message display (polling-based)
- Message list showing sender name, message text, and timestamp
- Text input and send button at the bottom
- Online/recent users indicator

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Backend: Store messages with sender name, text, and timestamp. Provide APIs to post a message and fetch all messages (paginated/latest N). Store recent users.
2. Frontend: Nickname prompt on first load (stored in localStorage). Chat UI with scrollable message list, input bar, send button. Poll backend every 2-3 seconds for new messages.
