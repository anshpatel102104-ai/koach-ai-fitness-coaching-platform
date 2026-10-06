import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Mail, Crown, Check, Clock, X, Loader2, ChevronDown, ShieldAlert } from 'lucide-react';
import { Page, PageHeader, Panel, PanelHeader, Initials, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SettingsField, fieldClass } from '@/components/settings/SettingsLayout';
import { useTeamRole } from '@/lib/useTeamRole';

function RoleBadge({ role }) {
  if (role === 'owner') return <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" /> Owner</Badge>;
  return <Badge variant="secondary">Coach</Badge>;
}

function StatusBadge({ status }) {
  if (status === 'accepted') {
    return <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground"><Check className="h-3.5 w-3.5 text-success" /> Active</span>;
  }
  return <span className="inline-flex items-center gap-1 text-[13px] text-warning"><Clock className="h-3.5 w-3.5" /> Invite pending</span>;
}

function RoleDropdown({ member, onChangeRole }) {
  if (member.role_label === 'owner') return null; // can't demote the owner via dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" title="Change role">Role <ChevronDown /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {['owner', 'coach'].map(role => (
          <DropdownMenuItem key={role} onClick={() => onChangeRole(member, role)} className="capitalize">
            {role === member.role_label ? <Check className="h-4 w-4" /> : <span className="w-4" />}
            {role}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MemberRow({ member, isYou, onRemove, onChangeRole, isOwnerViewing }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
      <Initials name={member.name || member.email || '?'} size={40} tone={member.role_label === 'owner' ? 'ink' : 'default'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[15px] font-semibold text-foreground">{member.name}</p>
          {isYou && <span className="text-[13px] text-muted-foreground">you</span>}
        </div>
        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <StatusBadge status={member.invite_status} />
        <RoleBadge role={member.role_label} />
        {/* Owner-only controls */}
        {isOwnerViewing && !isYou && (
          <>
            <RoleDropdown member={member} onChangeRole={onChangeRole} />
            <Button variant="ghost" size="icon" onClick={() => onRemove(member)} title="Remove from team"
              className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <X />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function InviteModal({ teamId, userId, onClose, onInvited }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { toast.error('Name and email are required'); return; }

    setLoading(true);
    try {
      // Step 1: Create the TeamMember record — this MUST succeed regardless of email
      await db.entities.TeamMember.create({
        team_id: teamId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role_label: 'coach',
        invite_status: 'pending',
        invited_by: userId,
      });

      // Step 2: Notify the invited coach by calling onInvited so they appear in the list immediately
      onInvited();

      // Step 3: Try to send invite email — failure must NOT block the UI or undo the invite
      let emailSent = false;
      try {
        const htmlBody = `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="color:#111318;margin-bottom:8px">You've been invited to a coaching team</h2>
            <p style="color:#5E6470">Hi ${name.trim()},</p>
            <p style="color:#5E6470">You've been invited to join a coaching team on KOACH AI.</p>
            <p style="margin:24px 0">
              <a href="${window.location.origin}" style="background:#111318;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                Accept the invite
              </a>
            </p>
            <p style="color:#5E6470;font-size:13px">Sign up or log in with this email address and you'll be connected to the team automatically.</p>
            <p style="color:#5E6470;font-size:12px;margin-top:24px">The KOACH AI Team</p>
          </div>`;

        await Promise.race([
          db.functions.invoke('sendEmailNotification', {
            to: email.trim().toLowerCase(),
            subject: "You've been invited to join a KOACH AI team",
            html: htmlBody,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
        ]);
        emailSent = true;
      } catch (emailErr) {
        // Email failed or timed out — invite record is already saved, just warn
        console.warn('Invite email failed:', emailErr.message);
      }

      if (emailSent) {
        toast.success(`Invite sent to ${email.trim()}`);
      } else {
        toast.success(`${name.trim()} added as a pending invite. The email did not send, so share the link with them yourself.`);
      }

      onClose();
    } catch (err) {
      toast.error(`Could not create the invite: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a coach</DialogTitle>
          <DialogDescription>
            They get an email. Once they sign up or log in with that address, they join your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SettingsField label="Full name">
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" className={fieldClass} />
          </SettingsField>
          <SettingsField label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="coach@example.com" className={fieldClass} />
          </SettingsField>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <><Loader2 className="animate-spin" /> Sending</> : <><Mail /> Send invite</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Team() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const { isOwner } = useTeamRole();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => me(),
  });

  // Find or create the owner's team
  const { data: teams = [], isLoading: loadingTeam } = useQuery({
    queryKey: ['my-team'],
    queryFn: () => db.entities.Team.filter({ owner_coach_id: user?.id }),
    enabled: !!user?.id,
  });
  const team = teams[0];

  // Load team members
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['team-members', team?.id],
    queryFn: () => db.entities.TeamMember.filter({ team_id: team.id }),
    enabled: !!team?.id,
  });

  // Seed owner as TeamMember if not already present
  const seedOwnerMember = async (teamId) => {
    const existing = await db.entities.TeamMember.filter({ team_id: teamId });
    const ownerExists = existing.some(m => m.user_id === user.id || m.email === user.email);
    if (!ownerExists) {
      await db.entities.TeamMember.create({
        team_id: teamId,
        user_id: user.id,
        name: user.full_name || 'Team Owner',
        email: user.email,
        role_label: 'owner',
        invite_status: 'accepted',
        invited_by: user.id,
      });
      qc.invalidateQueries({ queryKey: ['team-members', teamId] });
    }
  };

  // Auto-seed owner member when team loads
  useEffect(() => {
    if (team?.id && user?.id) {
      seedOwnerMember(team.id);
    }
  }, [team?.id, user?.id]);

  // If no team exists yet, seed it
  const handleSeedTeam = async () => {
    const res = await db.functions.invoke('seedTeam', {});
    qc.invalidateQueries({ queryKey: ['my-team'] });
    toast.success('Team created');
  };

  const handleRemove = async (member) => {
    if (!confirm(`Remove ${member.name} from the team?`)) return;
    await db.entities.TeamMember.delete(member.id);
    qc.invalidateQueries({ queryKey: ['team-members', team?.id] });
    toast.success(`${member.name} removed from team`);
  };

  const handleChangeRole = async (member, newRole) => {
    await db.entities.TeamMember.update(member.id, { role_label: newRole });
    qc.invalidateQueries({ queryKey: ['team-members', team?.id] });
    toast.success(`${member.name} is now ${newRole === 'owner' ? 'an Owner' : 'a Coach'}`);
  };

  const isLoading = loadingTeam || loadingMembers;

  // Sort: owner first, then by invite status
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role_label === 'owner') return -1;
    if (b.role_label === 'owner') return 1;
    return 0;
  });

  const pendingCount = sortedMembers.filter(m => m.invite_status === 'pending').length;

  return (
    <Page>
      <Link to="/settings" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>
      <PageHeader
        title="Team"
        subtitle={team
          ? `${team.name}. ${sortedMembers.length} ${sortedMembers.length === 1 ? 'member' : 'members'}${pendingCount ? `, ${pendingCount} waiting to accept` : ''}.`
          : 'Coaches who work with your clients under your account.'}
        actions={team && isOwner && (
          <Button onClick={() => setShowInvite(true)}><UserPlus /> Invite coach</Button>
        )}
      />

      {/* No team state */}
      {!isLoading && !team && (
        <Panel>
          <EmptyState
            title="No team yet"
            body="Set one up to add coaches who can work with your clients."
            action={<Button onClick={handleSeedTeam}>Set up my team</Button>}
          />
        </Panel>
      )}

      {team && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <Panel>
            <PanelHeader title="Members" subtitle={isOwner ? 'Owners can invite, remove and change roles.' : undefined} />
            <div className="divide-y divide-border px-5 pb-2 sm:px-6">
              {/* Loading */}
              {isLoading && (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && sortedMembers.length === 0 && (
                <p className="py-10 text-sm text-muted-foreground">No one on the team yet.</p>
              )}
              {!isLoading && sortedMembers.map(member => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isYou={member.user_id === user?.id || member.email === user?.email}
                  onRemove={handleRemove}
                  onChangeRole={handleChangeRole}
                  isOwnerViewing={isOwner}
                />
              ))}
            </div>
          </Panel>

          {/* Owner sees how-to, coach sees read-only note */}
          {isOwner ? (
            <Panel className="p-5">
              <p className="text-[15px] font-semibold text-foreground">How invites work</p>
              <ol className="mt-3 space-y-3">
                {[
                  'Invite a coach with their name and email.',
                  'They get an email with a link to sign up or log in.',
                  'When they log in with that email, they show as active.',
                  'Use Role to make another coach an owner.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-input text-[13px] font-semibold tabular-nums text-foreground">{i + 1}</span>
                    <p className="pt-0.5 text-sm leading-snug text-muted-foreground">{step}</p>
                  </li>
                ))}
              </ol>
            </Panel>
          ) : (
            <Panel className="flex items-start gap-3 p-5">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <p className="text-sm leading-snug text-muted-foreground">
                You have <strong className="text-foreground">coach</strong> access. Only the team owner can invite or remove coaches and manage billing.
              </p>
            </Panel>
          )}
        </div>
      )}

      {/* Invite modal */}
      {showInvite && team && (
        <InviteModal
          teamId={team.id}
          userId={user?.id}
          onClose={() => setShowInvite(false)}
          onInvited={() => qc.invalidateQueries({ queryKey: ['team-members', team.id] })}
        />
      )}
    </Page>
  );
}
