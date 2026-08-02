import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, LifeBuoy, Send, Plus } from 'lucide-react'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import GoldInput from '../../components/ui/GoldInput'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import useAuthStore from '../../stores/authStore'
import { createTicket, getMyTickets, getAllTickets, getTicketById, updateTicketStatus, addTicketReply } from '../../api/supportTickets'
import { formatDate } from '../../utils/formatters'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const statusVariant = (status) => {
  if (status === 'OPEN') return 'info'
  if (status === 'IN_PROGRESS') return 'gold'
  if (status === 'RESOLVED') return 'success'
  return 'default'
}

function TicketDetailModal({ ticketId, onClose, isSuperAdmin }) {
  const qc = useQueryClient()
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: () => getTicketById(ticketId),
    enabled: !!ticketId,
  })
  const ticket = data?.data

  const invalidateLists = () => {
    qc.invalidateQueries(['my-tickets'])
    qc.invalidateQueries(['all-tickets'])
    qc.invalidateQueries(['support-ticket', ticketId])
  }

  const handleReply = async (e) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      await addTicketReply(ticketId, reply.trim())
      setReply('')
      invalidateLists()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to send reply') }
    finally { setSending(false) }
  }

  const handleStatusChange = async (status) => {
    setUpdatingStatus(true)
    try {
      await updateTicketStatus(ticketId, status)
      toast.success('Status updated')
      invalidateLists()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to update status') }
    finally { setUpdatingStatus(false) }
  }

  return (
    <Modal open={!!ticketId} onClose={onClose} title={ticket?.subject || 'Ticket'} size="lg">
      {isLoading || !ticket ? (
        <SkeletonLoader type="table-row" />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Raised by {ticket.raised_by_name} · {formatDate(ticket.createdAt)}
            </p>
            {isSuperAdmin ? (
              <select
                value={ticket.status}
                disabled={updatingStatus}
                onChange={e => handleStatusChange(e.target.value)}
                className="text-xs rounded-lg px-2 py-1"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            ) : (
              <Badge variant={statusVariant(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
            )}
          </div>

          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-elevated)' }}>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{ticket.description}</p>
          </div>

          {ticket.replies?.length > 0 && (
            <div className="space-y-3 mb-4 max-h-[35vh] overflow-y-auto pr-1">
              {ticket.replies.map(r => (
                <div key={r.support_ticket_reply_id} className="rounded-xl p-3"
                  style={{ background: r.responder_role === 'SUPER_ADMIN' ? 'rgba(245,158,11,0.08)' : 'var(--bg-elevated)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{r.responder_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(r.createdAt)}</p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{r.message}</p>
                </div>
              ))}
            </div>
          )}

          {ticket.status !== 'CLOSED' && (
            <form onSubmit={handleReply} className="flex items-end gap-2">
              <div className="flex-1">
                <GoldInput label="Reply" name="reply" value={reply} onChange={e => setReply(e.target.value)} />
              </div>
              <GoldButton type="submit" loading={sending} icon={<Send size={13} />}>Send</GoldButton>
            </form>
          )}
        </>
      )}
    </Modal>
  )
}

function TicketRow({ ticket, onOpen }) {
  return (
    <button onClick={() => onOpen(ticket.support_ticket_id)} className="w-full text-left">
      <div className="flex items-center gap-4 px-5 py-4 border-b transition-colors hover:bg-[var(--bg-elevated)]"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ticket.subject}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {ticket.raised_by_name} · {formatDate(ticket.createdAt)}
            {ticket.replies?.length > 0 ? ` · ${ticket.replies.length} repl${ticket.replies.length === 1 ? 'y' : 'ies'}` : ''}
          </p>
        </div>
        <Badge variant={statusVariant(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
      </div>
    </button>
  )
}

export default function Support() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { role } = useAuthStore()
  const isSuperAdmin = role === 'SUPER_ADMIN'
  const backPath = role === 'SUPER_ADMIN' ? '/admin' : role === 'ADMIN' ? '/studio' : '/gallery'

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ subject: '', description: '' })
  const [creating, setCreating] = useState(false)
  const [openTicketId, setOpenTicketId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => getMyTickets({ page: 1, limit: 50 }),
    enabled: !isSuperAdmin,
  })
  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ['all-tickets', statusFilter],
    queryFn: () => getAllTickets({ page: 1, limit: 50, status: statusFilter || undefined }),
    enabled: isSuperAdmin,
  })

  const tickets = isSuperAdmin ? (allData?.data?.items || []) : (myData?.data?.items || [])
  const isLoading = isSuperAdmin ? allLoading : myLoading

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createTicket(form)
      toast.success('Ticket raised — we\'ll get back to you soon')
      setForm({ subject: '', description: '' })
      setCreateOpen(false)
      qc.invalidateQueries(['my-tickets'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to raise ticket') }
    finally { setCreating(false) }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <button onClick={() => navigate(backPath)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-gold-500 transition-colors mb-6">
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <LifeBuoy size={22} className="text-gold-500" />
            {isSuperAdmin ? 'Support Tickets' : 'Help & Support'}
          </h1>
          {!isSuperAdmin && (
            <GoldButton onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Raise Ticket</GoldButton>
          )}
        </div>

        {isSuperAdmin && (
          <div className="flex gap-1 p-1 rounded-xl mb-4 w-fit" style={{ background: 'var(--bg-elevated)' }}>
            {['', ...STATUS_OPTIONS].map(s => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: statusFilter === s ? 'var(--bg-surface)' : 'transparent',
                  color: statusFilter === s ? '#F59E0B' : 'var(--text-secondary)',
                }}
              >
                {s ? s.replace('_', ' ') : 'All'}
              </button>
            ))}
          </div>
        )}

        <GlassCard hover={false} className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No support tickets yet</p>
            </div>
          ) : (
            tickets.map(t => (
              <TicketRow key={t.support_ticket_id} ticket={t} onOpen={setOpenTicketId} />
            ))
          )}
        </GlassCard>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Raise a Support Ticket">
        <form onSubmit={handleCreate}>
          <GoldInput label="Subject *" name="subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={5}
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <GoldButton type="submit" loading={creating} className="flex-1">Submit</GoldButton>
            <GoldButton type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</GoldButton>
          </div>
        </form>
      </Modal>

      <TicketDetailModal ticketId={openTicketId} onClose={() => setOpenTicketId(null)} isSuperAdmin={isSuperAdmin} />
    </div>
  )
}
