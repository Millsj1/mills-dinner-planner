import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import './Members.css'

export default function Members({ onClose }) {
  const { household, isOwner, session } = useAuth()
  const [members, setMembers]         = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [form, setForm] = useState({ display_name: '', email: '', role: 'member' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [copiedId, setCopiedId] = useState(null)

  async function load() {
    setLoading(true)
    const [membersRes, invitesRes] = await Promise.all([
      supabase.from('household_members').select('*').eq('household_id', household.id).order('joined_at'),
      supabase.from('invitations').select('*').eq('household_id', household.id).eq('accepted', false).order('created_at', { ascending: false }),
    ])
    if (!membersRes.error) setMembers(membersRes.data || [])
    if (!invitesRes.error) setInvitations(invitesRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (household) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household])

  async function handleInvite(e) {
    e.preventDefault()
    setError('')
    if (!form.email.trim() || !form.display_name.trim()) {
      setError('Name and email are required')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('invitations').insert({
      household_id: household.id,
      invited_by: session.user.id,
      email: form.email.trim().toLowerCase(),
      display_name: form.display_name.trim(),
      role: form.role,
    })
    if (error) setError(error.message)
    else {
      setForm({ display_name: '', email: '', role: 'member' })
      await load()
    }
    setSaving(false)
  }

  function inviteUrl(token) {
    return `${window.location.origin}/?invite=${token}`
  }

  async function copyInvite(invite) {
    const url = inviteUrl(invite.token)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(invite.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (e) {
      window.prompt('Copy invite link:', url)
    }
  }

  async function cancelInvite(id) {
    if (!window.confirm('Cancel this invitation?')) return
    await supabase.from('invitations').delete().eq('id', id)
    await load()
  }

  async function changeRole(memberId, newRole) {
    await supabase.from('household_members').update({ role: newRole }).eq('id', memberId)
    await load()
  }

  async function removeMember(memberId, displayName) {
    if (!window.confirm(`Remove ${displayName} from the household?`)) return
    await supabase.from('household_members').delete().eq('id', memberId)
    await load()
  }

  if (loading) return <div className="members-loading">Loading…</div>

  return (
    <div className="members-page">
      <div className="members-header">
        <h2>Members</h2>
        <button className="members-close" onClick={onClose}>✕</button>
      </div>

      <section className="members-section">
        <h3 className="members-section-title">Active members</h3>
        <ul className="members-list">
          {members.map(m => (
            <li key={m.id} className="member-row">
              <div>
                <div className="member-name">{m.display_name}</div>
                <div className="member-email">{m.email}</div>
              </div>
              <div className="member-controls">
                {isOwner && m.user_id !== session.user.id ? (
                  <select
                    value={m.role}
                    onChange={e => changeRole(m.id, e.target.value)}
                    className="member-role-select"
                  >
                    <option value="owner">Owner</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className={`member-role role-${m.role}`}>{m.role}</span>
                )}
                {isOwner && m.user_id !== session.user.id && (
                  <button className="member-remove" onClick={() => removeMember(m.id, m.display_name)}>
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {invitations.length > 0 && (
        <section className="members-section">
          <h3 className="members-section-title">Pending invitations</h3>
          <ul className="members-list">
            {invitations.map(inv => (
              <li key={inv.id} className="member-row">
                <div>
                  <div className="member-name">{inv.display_name} <span className="invite-pending">pending</span></div>
                  <div className="member-email">{inv.email} · {inv.role}</div>
                </div>
                <div className="member-controls">
                  <button className="invite-copy" onClick={() => copyInvite(inv)}>
                    {copiedId === inv.id ? 'Copied!' : 'Copy link'}
                  </button>
                  {isOwner && (
                    <button className="member-remove" onClick={() => cancelInvite(inv.id)}>
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOwner && (
        <section className="members-section">
          <h3 className="members-section-title">Invite someone new</h3>
          <form onSubmit={handleInvite} className="invite-form">
            <input
              type="text"
              placeholder="Display name (e.g. Shannon)"
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            />
            <input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              <option value="member">Member (full access)</option>
              <option value="viewer">Viewer (read-only)</option>
            </select>
            {error && <p className="invite-error">{error}</p>}
            <button type="submit" disabled={saving} className="invite-submit">
              {saving ? 'Creating invite…' : 'Create invitation'}
            </button>
            <p className="invite-help">
              An invitation row is created. Copy the link from the Pending section above and share it however you like
              (text, email, iMessage). The recipient signs in with the matching email and is added automatically.
            </p>
          </form>
        </section>
      )}
    </div>
  )
}
