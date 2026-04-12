# Embed Integration Guide

ApproveSG provides iframe-ready pages that host products drop into their own UIs. The embed system uses short-lived JWTs so the host product's API key never reaches the browser.

## Auth Flow

```
Host product backend                    ApproveSG                     Browser (iframe)
       │                                    │                              │
       │  POST /api/v1/embed-tokens         │                              │
       │  (API key + user context)          │                              │
       │───────────────────────────────────>│                              │
       │                                    │                              │
       │  { "token": "eyJ..." }             │                              │
       │<───────────────────────────────────│                              │
       │                                    │                              │
       │  Render iframe with ?token=...     │                              │
       │─────────────────────────────────────────────────────────────────>│
       │                                    │                              │
       │                                    │  Page loads, verifies token  │
       │                                    │<─────────────────────────────│
```

## Step 1: Mint an Embed Token (Server-Side)

Call this from your backend — never from the browser.

```javascript
// Node.js / Express example
async function getEmbedToken(user) {
  const response = await fetch('https://approve-sg.up.railway.app/api/v1/embed-tokens', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.APPROVESG_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      name: user.displayName,
      role: user.approverRole, // e.g., "hod", "vp", "principal"
    }),
  });

  const { token } = await response.json();
  return token; // Pass this to the frontend
}
```

```python
# Python / Flask example
import requests

def get_embed_token(user):
    resp = requests.post(
        'https://approve-sg.up.railway.app/api/v1/embed-tokens',
        headers={
            'Authorization': f'Bearer {os.environ["APPROVESG_API_KEY"]}',
            'Content-Type': 'application/json',
        },
        json={
            'email': user.email,
            'name': user.display_name,
            'role': user.approver_role,
        },
    )
    return resp.json()['token']
```

## Step 2: Render the Iframe

Pass the token as a `?token=` query parameter.

### Inbox (Pending Approvals)

Shows submissions waiting on the current user's review.

```html
<iframe
  src="https://approve-sg.up.railway.app/embed/inbox?token=TOKEN_HERE"
  style="width: 100%; height: 600px; border: none;"
  allow="clipboard-write"
></iframe>
```

### Submission Timeline

Shows a single submission's approval progress.

```html
<iframe
  src="https://approve-sg.up.railway.app/embed/submissions/SUBMISSION_ID?token=TOKEN_HERE"
  style="width: 100%; height: 500px; border: none;"
  allow="clipboard-write"
></iframe>
```

### Workflow Builder

Lets admins define approval chains.

```html
<!-- Create new workflow -->
<iframe
  src="https://approve-sg.up.railway.app/embed/workflow-builder?token=TOKEN_HERE"
  style="width: 100%; height: 700px; border: none;"
></iframe>

<!-- Edit existing workflow -->
<iframe
  src="https://approve-sg.up.railway.app/embed/workflow-builder?token=TOKEN_HERE&workflowId=WORKFLOW_ID"
  style="width: 100%; height: 700px; border: none;"
></iframe>
```

### Analytics Dashboard

Shows approval aging, bottleneck steps, and chase effectiveness.

```html
<iframe
  src="https://approve-sg.up.railway.app/embed/analytics?token=TOKEN_HERE"
  style="width: 100%; height: 800px; border: none;"
></iframe>
```

## Step 3: Theme Matching (Optional)

Override the primary colour and logo to match your product's brand.

```
?theme=primaryColor,logoUrl
```

**Examples:**
```
?theme=FF5722
?theme=0066CC,https://myapp.com/logo.png
?token=TOKEN&theme=1A73E8,https://cdn.myapp.com/logo.svg
```

- `primaryColor` — hex colour (with or without `#`). Overrides `--approve-primary` CSS variable.
- `logoUrl` — URL to a logo image. Displayed at the top of the embed shell.

## Full Integration Example (React)

```tsx
import { useEffect, useState } from 'react';

function ApprovalInbox({ user }) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Fetch embed token from your backend
    fetch('/api/approvesg/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
      .then(r => r.json())
      .then(data => setToken(data.token));
  }, [user.id]);

  if (!token) return <div>Loading...</div>;

  const baseUrl = process.env.NEXT_PUBLIC_APPROVESG_URL;

  return (
    <iframe
      src={`${baseUrl}/embed/inbox?token=${token}&theme=1A73E8`}
      style={{ width: '100%', height: '600px', border: 'none' }}
      title="Pending Approvals"
    />
  );
}
```

## Full Integration Example (Django + HTMX)

```python
# views.py
def approval_inbox(request):
    token = get_embed_token(request.user)
    return render(request, 'approvals/inbox.html', {'token': token})
```

```html
<!-- inbox.html -->
<iframe
  src="https://approve-sg.up.railway.app/embed/inbox?token={{ token }}&theme=2196F3"
  style="width: 100%; height: 600px; border: none;"
  title="Pending Approvals"
></iframe>
```

## Security Notes

- **Tokens expire in 1 hour.** If the iframe session is long-lived, refresh the token periodically from your backend.
- **API keys stay server-side.** The embed token is the only credential that reaches the browser — it's short-lived and scoped to a single user.
- **Org isolation is enforced.** Embed tokens are scoped to the org that created them. Users cannot see data from other orgs.
- **The `?token=` parameter is visible in the URL.** This is acceptable because tokens are short-lived and scoped. For extra security, use `postMessage` communication instead of URL params (not yet supported).

## Available Embed Pages

| Page | URL | Description |
|------|-----|-------------|
| Inbox | `/embed/inbox` | Submissions waiting on the user |
| Submission | `/embed/submissions/:id` | Single submission timeline |
| Workflow Builder | `/embed/workflow-builder` | Create/edit approval chains |
| Analytics | `/embed/analytics` | Aging and bottleneck dashboard |
