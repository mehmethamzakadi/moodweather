// src/app/debug/page.tsx - Session Debug Sayfası
"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

interface DebugSession {
  id: string;
  userId: string;
  expires: string;
  sessionToken: string;
}

interface DebugAccount {
  id: string;
  provider: string;
  userId: string;
  providerAccountId: string;
}

export default function DebugPage() {
  const { data: session, status } = useSession()
  const [dbSessions, setDbSessions] = useState<DebugSession[]>([])
  const [dbAccounts, setDbAccounts] = useState<DebugAccount[]>([])

  useEffect(() => {
    fetchDebugData()
  }, [])

  const fetchDebugData = async () => {
    try {
      const response = await fetch('/api/debug/sessions')
      const data = await response.json()
      setDbSessions(data.sessions || [])
      setDbAccounts(data.accounts || [])
    } catch (error) {
      console.error('Debug data fetch error:', error)
    }
  }

  const clearAllData = async () => {
    if (confirm('Database\'deki TÜM verileri silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch('/api/debug/clear-all', {
          method: 'POST'
        })
        const result = await response.json()
        console.log('Clear all result:', result)
        alert('Tüm veriler silindi!')
        fetchDebugData()
      } catch (error) {
        console.error('Clear all error:', error)
        alert('Silme işlemi başarısız!')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">NextAuth Debug</h1>
        
        {/* Current Session */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Session</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p><strong>Status:</strong> {status}</p>
            <pre className="mt-2 text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>

        {/* Database Sessions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Database Sessions ({dbSessions.length})</h2>
            <button
              onClick={clearAllData}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Clear ALL Database
            </button>
          </div>
          <div className="space-y-2">
            {dbSessions.map((session, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                <p><strong>ID:</strong> {session.id}</p>
                <p><strong>User ID:</strong> {session.userId}</p>
                <p><strong>Expires:</strong> {new Date(session.expires).toLocaleString()}</p>
                <p><strong>Session Token:</strong> {session.sessionToken?.substring(0, 20)}...</p>
              </div>
            ))}
          </div>
        </div>

        {/* Database Accounts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Database Accounts ({dbAccounts.length})</h2>
          <div className="space-y-2">
            {dbAccounts.map((account, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                <p><strong>ID:</strong> {account.id}</p>
                <p><strong>Provider:</strong> {account.provider}</p>
                <p><strong>User ID:</strong> {account.userId}</p>
                <p><strong>Provider Account ID:</strong> {account.providerAccountId}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
