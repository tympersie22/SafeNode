# 👥 How Teams Work in SafeNode

Complete guide to team vaults, collaboration, and role-based access control.

---

## 🎯 Overview

SafeNode Teams allows you to:
- **Share encrypted vaults** with team members
- **Control access** with role-based permissions
- **Track activity** with audit logs
- **Manage members** and invitations
- **Scale collaboration** for organizations

---

## 🏢 Creating a Team

### Step 1: Create Team

1. Go to **Teams** in the sidebar
2. Click **Create Team**
3. Enter:
   - **Team Name** (e.g., "Engineering Team")
   - **Description** (optional)
4. Click **Create**

### Step 2: Invite Members

1. Open your team
2. Click **Invite Members**
3. Enter **email addresses**
4. Select **roles** for each member
5. Click **Send Invitations**

### Step 3: Share Vault

1. In team dashboard, click **Create Shared Vault**
2. Enter vault name and description
3. Click **Create**
4. Vault is automatically accessible to all team members

---

## 👔 Team Roles & Permissions

### Owner
**Full control** over the team
- ✅ Create/edit/delete vaults
- ✅ Invite/remove members
- ✅ Manage roles
- ✅ View audit logs
- ✅ Delete team
- ✅ Change team settings

### Admin
**Near-full control** (cannot delete team)
- ✅ Create/edit/delete vaults
- ✅ Invite/remove members
- ✅ Manage roles (except owner)
- ✅ View audit logs
- ✅ Change team settings

### Manager
**Vault management** and member oversight
- ✅ Create/edit vaults
- ✅ View all vaults
- ✅ Invite members
- ✅ View audit logs
- ❌ Cannot delete vaults
- ❌ Cannot remove members

### Member
**Standard access** to team vaults
- ✅ View shared vaults
- ✅ Create/edit entries in vaults
- ❌ Cannot create new vaults
- ❌ Cannot invite members
- ❌ Cannot view audit logs

### Viewer
**Read-only access**
- ✅ View shared vaults
- ❌ Cannot edit entries
- ❌ Cannot create vaults
- ❌ Cannot invite members

---

## 🔐 Team Vaults

### Creating a Shared Vault

1. **Navigate** to team dashboard
2. **Click** "Create Shared Vault"
3. **Enter** vault name and description
4. **Click** "Create"
5. **Vault is shared** with all team members

### Vault Encryption

- **End-to-end encrypted** - Each team member's access is encrypted
- **Access keys** - Shared securely with team members
- **Zero-knowledge** - Server never sees plaintext data

### Managing Vault Access

**Add Members:**
1. Open vault
2. Click **Share** button
3. Enter email addresses
4. Select role for vault access
5. Click **Share**

**Remove Access:**
1. Open vault settings
2. Click **Members** tab
3. Click **Remove** next to member
4. Confirm removal

---

## 📧 Invitations

### Sending Invitations

1. Go to **Team Settings** → **Members**
2. Click **Invite Members**
3. Enter email addresses
4. Select roles
5. Click **Send Invitations**

### Accepting Invitations

**Via Email:**
1. Check email inbox
2. Click **Accept Invitation** link
3. Log in to SafeNode (or create account)
4. Accept invitation

**In-App:**
1. Go to **Notifications**
2. Click **Team Invitation**
3. Review team details
4. Click **Accept** or **Decline**

### Invitation Status

- **Pending** - Invitation sent, awaiting acceptance
- **Accepted** - Member joined team
- **Declined** - Invitation was declined
- **Expired** - Invitation expired (7 days)

---

## 🔍 Audit Logs

### Viewing Team Activity

1. Go to **Team Settings** → **Audit Logs**
2. View:
   - **Member actions** (entry created, edited, deleted)
   - **Access events** (vault opened, shared)
   - **Management actions** (members added, roles changed)
   - **Timestamps** and IP addresses

### Audit Log Filters

- **Date range** - Filter by time period
- **Action type** - Filter by action
- **Member** - Filter by team member
- **Vault** - Filter by specific vault

### Exporting Audit Logs

1. Go to **Audit Logs**
2. Set filters (optional)
3. Click **Export CSV**
4. Download and review

**CSV includes:**
- Timestamp
- Action
- User
- Resource (vault/entry)
- IP address
- Metadata

---

## 💼 Team Management

### Changing Member Roles

1. Go to **Team Settings** → **Members**
2. Click **Edit** next to member
3. Select new **Role**
4. Click **Save**

**Note**: You cannot change your own role or remove the last owner.

### Removing Members

1. Go to **Team Settings** → **Members**
2. Click **Remove** next to member
3. Confirm removal
4. Member loses access immediately

**Note**: Removing a member does not delete their personal SafeNode account.

### Team Settings

**General:**
- Team name
- Description
- Team avatar/logo

**Security:**
- Require 2FA for all members
- Enable SSO (Enterprise)
- Auto-lock timer

**Privacy:**
- Allow external sharing
- Audit log retention (30/60/90 days)
- Data export settings

---

## 🚫 Limits & Restrictions

### Subscription Limits

Team features are available on:
- **Teams Plan**: Up to 50 members, 100 vaults
- **Business Plan**: Up to 200 members, 500 vaults
- **Enterprise Plan**: Unlimited members and vaults

### Per-User Limits

- **Vaults per user**: Based on subscription tier
- **Entries per vault**: Unlimited
- **Team memberships**: Unlimited (can join multiple teams)

---

## 🔄 Collaboration Workflow

### Typical Workflow

1. **Team Owner** creates team
2. **Team Owner** invites members
3. **Members** accept invitations
4. **Team Manager** creates shared vaults
5. **Members** add/edit entries in vaults
6. **All members** see changes in real-time
7. **Audit logs** track all activity

### Best Practices

- **Use roles wisely** - Give minimum necessary permissions
- **Organize by project** - Create vaults per project/client
- **Use tags** - Organize entries within vaults
- **Regular audits** - Review audit logs monthly
- **Remove inactive members** - Keep team roster clean

---

## 🆘 Troubleshooting

### Member Can't Access Vault

**Check:**
1. Member is part of team
2. Member has appropriate role
3. Vault is shared with member
4. Member's subscription allows teams

### Invitation Not Received

**Try:**
1. Check spam folder
2. Verify email address
3. Resend invitation
4. Check invitation expiration

### Permission Denied

**Check:**
1. Your role in team
2. Your role for specific vault
3. Team subscription tier
4. Team settings (2FA requirement, etc.)

---

## 📞 Support

- **Team Issues**: teams-support@safenode.app
- **Documentation**: https://docs.safenode.app/teams
- **Enterprise Support**: enterprise@safenode.app

---

**Collaborate securely with SafeNode Teams!** 👥🔐

