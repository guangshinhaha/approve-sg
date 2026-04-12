# Webhook Events

ApproveSG sends webhook notifications when submissions change state. Webhooks are HMAC-signed and retried with exponential backoff.

## Registering a Webhook

```bash
curl -X POST https://approve-sg.up.railway.app/api/v1/webhooks \
  -H "Authorization: Bearer asg_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://myapp.com/webhooks/approvesg",
    "events": ["submission.approved", "submission.rejected", "submission.sent_back", "step.completed"]
  }'
```

**Response (201):**
```json
{
  "id": "uuid",
  "url": "https://myapp.com/webhooks/approvesg",
  "events": ["submission.approved", "submission.rejected", "submission.sent_back", "step.completed"],
  "secret": "a1b2c3d4e5f6...",
  "active": true,
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Save the `secret`** — it's only returned on creation and is needed to verify webhook signatures.

## Webhook Delivery

- **Method:** POST
- **Content-Type:** `application/json`
- **Timeout:** 10 seconds
- **Retries:** 3 attempts with exponential backoff (1s, 2s, 4s)
- **Headers:**
  - `Content-Type: application/json`
  - `X-ApproveSG-Signature: <HMAC-SHA256 hex digest>`
  - `X-ApproveSG-Event: <event name>`

## Envelope Format

Every webhook delivery has this shape:

```json
{
  "event": "submission.approved",
  "data": { ... },
  "timestamp": "2024-01-16T14:30:00.000Z"
}
```

## Events

### submission.approved

Fired when a submission completes all approval steps.

```json
{
  "event": "submission.approved",
  "data": {
    "submissionId": "550e8400-e29b-41d4-a716-446655440000",
    "externalRef": "LEAVE-2024-001",
    "externalType": "leave_request"
  },
  "timestamp": "2024-01-16T14:30:00.000Z"
}
```

### submission.rejected

Fired when an approver rejects a submission.

```json
{
  "event": "submission.rejected",
  "data": {
    "submissionId": "550e8400-e29b-41d4-a716-446655440000",
    "externalRef": "LEAVE-2024-001",
    "externalType": "leave_request",
    "comments": "Insufficient leave balance"
  },
  "timestamp": "2024-01-16T14:30:00.000Z"
}
```

### submission.sent_back

Fired when an approver sends a submission back for revision.

```json
{
  "event": "submission.sent_back",
  "data": {
    "submissionId": "550e8400-e29b-41d4-a716-446655440000",
    "externalRef": "LEAVE-2024-001",
    "externalType": "leave_request",
    "comments": "Please provide supporting documentation"
  },
  "timestamp": "2024-01-16T14:30:00.000Z"
}
```

### step.completed

Fired when an intermediate step is approved (not the final step).

```json
{
  "event": "step.completed",
  "data": {
    "submissionId": "550e8400-e29b-41d4-a716-446655440000",
    "completedStep": 1,
    "nextStep": 2
  },
  "timestamp": "2024-01-16T14:30:00.000Z"
}
```

## HMAC Verification

The `X-ApproveSG-Signature` header contains an HMAC-SHA256 hex digest of the request body, signed with the webhook secret.

### Node.js

```javascript
const crypto = require('crypto');

function verifyWebhook(req, secret) {
  const signature = req.headers['x-approvesg-signature'];
  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// Express handler
app.post('/webhooks/approvesg', express.json(), (req, res) => {
  if (!verifyWebhook(req, process.env.APPROVESG_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, data } = req.body;

  switch (event) {
    case 'submission.approved':
      handleApproved(data.submissionId, data.externalRef);
      break;
    case 'submission.rejected':
      handleRejected(data.submissionId, data.externalRef, data.comments);
      break;
    case 'submission.sent_back':
      handleSentBack(data.submissionId, data.externalRef, data.comments);
      break;
    case 'step.completed':
      handleStepCompleted(data.submissionId, data.completedStep, data.nextStep);
      break;
  }

  res.status(200).json({ received: true });
});
```

### Python

```python
import hmac
import hashlib
import json

def verify_webhook(request, secret):
    signature = request.headers.get('X-ApproveSG-Signature', '')
    body = request.get_data(as_text=True)
    expected = hmac.new(
        secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

# Flask handler
@app.route('/webhooks/approvesg', methods=['POST'])
def handle_webhook():
    if not verify_webhook(request, os.environ['APPROVESG_WEBHOOK_SECRET']):
        return jsonify({'error': 'Invalid signature'}), 401

    event = request.json['event']
    data = request.json['data']

    if event == 'submission.approved':
        handle_approved(data['submissionId'], data.get('externalRef'))
    elif event == 'submission.rejected':
        handle_rejected(data['submissionId'], data.get('comments'))

    return jsonify({'received': True}), 200
```

### Go

```go
func verifyWebhook(body []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(body)
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(signature), []byte(expected))
}
```

## Best Practices

1. **Always verify the signature** before processing the webhook payload.
2. **Respond with 2xx quickly** — do heavy processing asynchronously. ApproveSG times out after 10 seconds.
3. **Handle duplicates** — webhooks may be retried. Use `submissionId` + `event` as an idempotency key.
4. **Use `externalRef`** to link back to your own records. Set it when creating submissions.
5. **Subscribe only to events you need** — reduces unnecessary traffic.
