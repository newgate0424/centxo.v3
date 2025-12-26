"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import Image from "next/image"
import {
  Users, Activity, MessageSquare,
  Search, ChevronLeft, ChevronRight, LogOut,
  Shield, Crown, User, Trash2, RefreshCw,
  LayoutDashboard, Users2, ClipboardList, Target, Mail, Plus, Loader2,
} from "lucide-react"

type TabType = "overview" | "users" | "activities" | "teams" | "goals" | "emails"

interface Stats {
  totalUsers: number
  totalTeams: number
  totalConversations: number
  totalMessages: number
  todayActivity: number
}

interface UserData {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  createdAt: string
  updatedAt?: string
  facebookName?: string
  _count?: {
    ownedTeams: number
    teamMemberships: number
    assignedConversations: number
  }
}

interface ActivityData {
  id: string
  userId: string
  userEmail: string
  userName: string | null
  action: string
  details: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface TeamData {
  id: string
  name: string
  owner: { id: string; name: string | null; email: string; image: string | null }
  members: Array<{
    id: string
    user: { id: string; name: string | null; email: string; image: string | null; role: string }
  }>
  _count: { members: number }
  createdAt: string
}

interface AllowedEmail {
  id: string
  email: string
  note: string | null
  createdAt: string
  createdBy: string | null
}

// Email Whitelist Section Component
function EmailWhitelistSection() {
  const [emails, setEmails] = useState<AllowedEmail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newNote, setNewNote] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchEmails = async () => {
    try {
      const res = await fetch('/api/admin/allowed-emails')
      const data = await res.json()
      if (data.success) {
        setEmails(data.data)
      }
    } catch (error) {
      console.error('Error fetching emails:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEmails()
  }, [])

  const handleAdd = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      alert('กรุณากรอก email ที่ถูกต้อง')
      return
    }

    setIsAdding(true)
    try {
      const res = await fetch('/api/admin/allowed-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, note: newNote })
      })
      const data = await res.json()
      if (data.success) {
        setNewEmail("")
        setNewNote("")
        fetchEmails()
      } else {
        alert(data.error || 'Error adding email')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`ลบ ${email} ออกจาก whitelist?\n\nผู้ใช้จะไม่สามารถ login ได้อีก`)) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/allowed-emails?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchEmails()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add new email */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" /> เพิ่ม Email ใหม่
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
            <input
              placeholder="Admin, Team Lead, Host..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={isAdding || !newEmail.trim()}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAdding ? "กำลังเพิ่ม..." : "เพิ่ม Email"}
        </button>
      </div>

      {/* Email list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5" /> รายชื่อ Email ที่อนุญาต
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">{emails.length}</span>
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : emails.length === 0 ? (
          <p className="text-center text-gray-500 py-8">ยังไม่มี email ใน whitelist</p>
        ) : (
          <div className="space-y-2">
            {emails.map((email) => (
              <div
                key={email.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900">{email.email}</div>
                  {email.note && <div className="text-sm text-gray-500">{email.note}</div>}
                  <div className="text-xs text-gray-400 mt-1">
                    เพิ่มเมื่อ {new Date(email.createdAt).toLocaleDateString('th-TH')}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(email.id, email.email)}
                  disabled={deletingId === email.id}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {deletingId === email.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        <strong>⚠️ คำเตือน:</strong> ถ้าลบ email ออกจาก whitelist ผู้ใช้จะไม่สามารถ login เข้าระบบได้อีก
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get tab from URL, default to "overview"
  const tabFromUrl = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || "overview")
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  // Sync activeTab with URL on mount and when URL changes
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    router.push(`/admin?tab=${tab}`, { scroll: false })
  }

  // Data states
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<UserData[]>([])
  const [usersByRole, setUsersByRole] = useState<Array<{ role: string; count: number }>>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [teams, setTeams] = useState<TeamData[]>([])

  // Goals state
  const [goalsData, setGoalsData] = useState<Record<number, {
    cover: string; cpm: string; deposit: string; loss: string; repeat: string; child: string; costPerDeposit: string;
  }>>({
    1: { cover: '', cpm: '', deposit: '', loss: '', repeat: '', child: '', costPerDeposit: '' },
    2: { cover: '', cpm: '', deposit: '', loss: '', repeat: '', child: '', costPerDeposit: '' },
    3: { cover: '', cpm: '', deposit: '', loss: '', repeat: '', child: '', costPerDeposit: '' },
    4: { cover: '', cpm: '', deposit: '', loss: '', repeat: '', child: '', costPerDeposit: '' },
  })
  const [selectedGoalTab, setSelectedGoalTab] = useState(1)
  const [savingGoals, setSavingGoals] = useState(false)

  // Pagination & filters
  const [userPage, setUserPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [userSearch, setUserSearch] = useState("")
  const [activityPage, setActivityPage] = useState(1)
  const [activityTotal, setActivityTotal] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === "overview") {
        const res = await fetch("/api/admin?type=overview")
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats)
          setRecentUsers(data.recentUsers)
          setUsersByRole(data.usersByRole)
          setAuthenticated(true)
        }
      } else if (activeTab === "users") {
        const res = await fetch(`/api/admin?type=users&page=${userPage}&limit=20&search=${userSearch}`)
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        if (res.ok) {
          const data = await res.json()
          setUsers(data.users)
          setUserTotal(data.pagination.total)
        }
      } else if (activeTab === "activities") {
        const res = await fetch(`/api/admin?type=activities&page=${activityPage}&limit=50`)
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        if (res.ok) {
          const data = await res.json()
          setActivities(data.activities)
          setActivityTotal(data.pagination.total)
        }
      } else if (activeTab === "teams") {
        const res = await fetch("/api/admin?type=teams")
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        if (res.ok) {
          const data = await res.json()
          setTeams(data.teams)
        }
      } else if (activeTab === "goals") {
        const res = await fetch("/api/admin/goals")
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        if (res.ok) {
          const data = await res.json()
          // Convert numeric values to strings for input fields
          const converted: Record<number, any> = {}
          for (const [tabId, values] of Object.entries(data.goals)) {
            const v = values as Record<string, number>
            converted[Number(tabId)] = {
              cover: String(v.cover || ''),
              cpm: String(v.cpm || ''),
              deposit: String(v.deposit || ''),
              loss: String(v.loss || ''),
              repeat: String(v.repeat || ''),
              child: String(v.child || ''),
              costPerDeposit: String(v.costPerDeposit || ''),
            }
          }
          setGoalsData(converted as any)
          setAuthenticated(true)
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error)
    }
    setLoading(false)
  }, [activeTab, userPage, userSearch, activityPage, router])

  // Save goals handler
  const handleSaveGoals = async () => {
    setSavingGoals(true)
    try {
      const res = await fetch("/api/admin/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tabId: selectedGoalTab,
          goals: goalsData[selectedGoalTab],
        }),
      })
      if (res.ok) {
        alert("บันทึกเป้าหมายสำเร็จ!")
      } else {
        alert("บันทึกไม่สำเร็จ")
      }
    } catch (error) {
      console.error("Failed to save goals:", error)
      alert("เกิดข้อผิดพลาด")
    }
    setSavingGoals(false)
  }

  // Update goal field handler
  const handleGoalChange = (field: string, value: string) => {
    setGoalsData(prev => ({
      ...prev,
      [selectedGoalTab]: {
        ...prev[selectedGoalTab],
        [field]: value,
      }
    }))
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" })
    router.push("/admin/login")
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!confirm(`Change role to ${newRole}?`)) return

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeRole", userId, newRole }),
      })
      if (res.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Failed to change role:", error)
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone!`)) return

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteUser", userId }),
      })
      if (res.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Failed to delete user:", error)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "host":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            <Crown className="w-3 h-3" /> Host
          </span>
        )
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <Shield className="w-3 h-3" /> Admin
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            <User className="w-3 h-3" /> Staff
          </span>
        )
    }
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: "🔑 Login",
      logout: "🚪 Logout",
      register: "📝 Register",
      change_role: "👑 Change Role",
      delete_user: "🗑️ Delete User",
      send_message: "💬 Send Message",
      create_team: "👥 Create Team",
      add_member: "➕ Add Member",
      remove_member: "➖ Remove Member",
      update_member_role: "🔄 Update Member Role",
      toggle_auto_assign: "🔀 Toggle Auto Assign",
      assign_conversation: "📌 Assign Conversation",
      connect_facebook: "🔗 Connect Facebook",
      disconnect_facebook: "❌ Disconnect Facebook",
      update_settings: "⚙️ Update Settings",
      view_conversation: "👁️ View Conversation",
      add_email_whitelist: "✅ Add to Whitelist",
      remove_email_whitelist: "⛔ Remove from Whitelist",
    }
    return labels[action] || action
  }

  if (!authenticated && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users2 },
    { id: "activities", label: "Activity Log", icon: ClipboardList },
    { id: "teams", label: "Teams", icon: Users },
    { id: "goals", label: "เป้าหมาย", icon: Target },
    { id: "emails", label: "Email Whitelist", icon: Mail },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs text-gray-500">Backend Management</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && stats && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                        <p className="text-xs text-gray-500">Total Users</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
                        <p className="text-xs text-gray-500">Teams</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
                        <p className="text-xs text-gray-500">Conversations</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.totalMessages.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Messages</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <Activity className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.todayActivity}</p>
                        <p className="text-xs text-gray-500">Today&apos;s Activity</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Users by Role & Recent Users */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h3>
                    <div className="space-y-3">
                      {usersByRole.map((item) => (
                        <div key={item.role} className="flex items-center justify-between">
                          {getRoleBadge(item.role)}
                          <span className="text-xl font-bold text-gray-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h3>
                    <div className="space-y-3">
                      {recentUsers.slice(0, 5).map((user) => (
                        <div key={user.id} className="flex items-center gap-3">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt=""
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{user.name || "No name"}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          {getRoleBadge(user.role)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-4">
                {/* Search */}
                <div className="flex gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value)
                        setUserPage(1)
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={loadData}
                    className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                            User
                          </th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                            Role
                          </th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden md:table-cell">
                            Stats
                          </th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden lg:table-cell">
                            Created
                          </th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {user.image ? (
                                  <Image
                                    src={user.image}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="rounded-full"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-500" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{user.name || "No name"}</p>
                                  <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={user.role}
                                onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="host">👑 Host</option>
                                <option value="admin">🛡️ Admin</option>
                                <option value="staff">👤 Staff</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>Teams: {user._count?.ownedTeams || 0}</span>
                                <span>Chats: {user._count?.assignedConversations || 0}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                              {format(new Date(user.createdAt), "MMM d, yyyy")}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {users.length} of {userTotal} users
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={userPage === 1}
                      className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">Page {userPage}</span>
                    <button
                      onClick={() => setUserPage((p) => p + 1)}
                      disabled={users.length < 20}
                      className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Activities Tab */}
            {activeTab === "activities" && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {activities.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">No activity logs yet</div>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-medium text-gray-900">{getActionLabel(activity.action)}</span>
                                <span className="text-xs text-gray-500">
                                  by {activity.userName || activity.userEmail}
                                </span>
                              </div>
                              {activity.details && (
                                <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded mb-2">
                                  {(() => {
                                    try {
                                      const details = JSON.parse(activity.details)
                                      return Object.entries(details)
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(" | ")
                                    } catch {
                                      return activity.details
                                    }
                                  })()}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                {activity.ipAddress && (
                                  <span className="flex items-center gap-1">
                                    🌐 IP: {activity.ipAddress}
                                  </span>
                                )}
                                {activity.userAgent && (
                                  <span className="hidden md:inline truncate max-w-xs" title={activity.userAgent}>
                                    💻 {activity.userAgent.slice(0, 50)}...
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-xs text-gray-400 whitespace-nowrap">
                              <div>{format(new Date(activity.createdAt), "dd MMM yyyy")}</div>
                              <div className="font-medium text-gray-600">{format(new Date(activity.createdAt), "HH:mm:ss")}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {activities.length} of {activityTotal} activities
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                      disabled={activityPage === 1}
                      className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">Page {activityPage}</span>
                    <button
                      onClick={() => setActivityPage((p) => p + 1)}
                      disabled={activities.length < 50}
                      className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Teams Tab */}
            {activeTab === "teams" && (
              <div className="space-y-4">
                {teams.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                    No teams created yet
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                            <p className="text-sm text-gray-500">
                              Owner: {team.owner.name || team.owner.email}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {team._count.members} members
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {team.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100"
                            >
                              {member.user.image ? (
                                <Image
                                  src={member.user.image}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                  <User className="w-3 h-3 text-gray-500" />
                                </div>
                              )}
                              <span className="text-sm text-gray-700">
                                {member.user.name || member.user.email}
                              </span>
                              {getRoleBadge(member.user.role)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Goals Tab */}
            {activeTab === "goals" && (
              <div className="space-y-6">
                {/* Tab Selector */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 1, name: "หวย" },
                    { id: 2, name: "บาคาร่า" },
                    { id: 3, name: "หวยม้า" },
                    { id: 4, name: "ฟุตบอลแอเรีย" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedGoalTab(tab.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedGoalTab === tab.id
                        ? "bg-purple-600 text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>

                {/* Goals Form */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    เป้าหมาย: {selectedGoalTab === 1 ? "หวย" : selectedGoalTab === 2 ? "บาคาร่า" : selectedGoalTab === 3 ? "หวยม้า" : "ฟุตบอลแอเรีย"}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เป้า Cover ($)</label>
                      <input
                        type="number"
                        value={goalsData[selectedGoalTab]?.cover || ''}
                        onChange={(e) => handleGoalChange('cover', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เป้า CPM</label>
                      <input
                        type="number"
                        value={goalsData[selectedGoalTab]?.cpm || ''}
                        onChange={(e) => handleGoalChange('cpm', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เป้าต้นทุน/เติม ($)</label>
                      <input
                        type="number"
                        value={goalsData[selectedGoalTab]?.costPerDeposit || ''}
                        onChange={(e) => handleGoalChange('costPerDeposit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เป้ายอดเติม ($)</label>
                      <input
                        type="number"
                        value={goalsData[selectedGoalTab]?.deposit || ''}
                        onChange={(e) => handleGoalChange('deposit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เป้ายอดเสีย (%)</label>
                      <input
                        type="number"
                        value={goalsData[selectedGoalTab]?.loss || ''}
                        onChange={(e) => handleGoalChange('loss', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เป้าทักซ้ำ (%)</label>
                      <input
                        type="number"
                        value={goalsData[selectedGoalTab]?.repeat || ''}
                        onChange={(e) => handleGoalChange('repeat', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เป้าเด็ก (%)</label>
                      <input
                        type="number"
                        value={goalsData[selectedGoalTab]?.child || ''}
                        onChange={(e) => handleGoalChange('child', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSaveGoals}
                      disabled={savingGoals}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingGoals ? "กำลังบันทึก..." : "💾 บันทึกเป้าหมาย"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Emails Whitelist Tab */}
            {activeTab === "emails" && (
              <EmailWhitelistSection />
            )}
          </>
        )}
      </main>
    </div>
  )
}
