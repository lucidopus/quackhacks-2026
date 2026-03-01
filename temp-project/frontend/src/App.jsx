import { useState } from 'react'
import Header from './components/Header.jsx'
import CompanySearch from './components/CompanySearch.jsx'
import AgentTimeline from './components/AgentTimeline.jsx'
import CompanyReport from './components/CompanyReport.jsx'

export default function App() {
  const [phase, setPhase] = useState('search') // 'search' | 'researching' | 'complete'
  const [events, setEvents] = useState([])
  const [finalReport, setFinalReport] = useState(null)
  const [searchedCompany, setSearchedCompany] = useState('')

  const handleResearch = async ({ companyName, sellerContext }) => {
    setPhase('researching')
    setEvents([])
    setFinalReport(null)
    setSearchedCompany(companyName)

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          seller_context: sellerContext,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let lineBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        lineBuffer += decoder.decode(value, { stream: true })
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            if (event.event === 'heartbeat') continue
            if (event.event === 'final_report') {
              setFinalReport(event)
              setPhase('complete')
            } else {
              setEvents((prev) => [...prev, event])
            }
          } catch {
            // ignore non-JSON lines
          }
        }
      }

      // flush remaining buffer
      if (lineBuffer.trim()) {
        try {
          const event = JSON.parse(lineBuffer)
          if (event.event === 'final_report') {
            setFinalReport(event)
            setPhase('complete')
          } else if (event.event !== 'heartbeat') {
            setEvents((prev) => [...prev, event])
          }
        } catch { /* ignore */ }
      }

      // If we never got a final_report, show whatever we have
      if (phase !== 'complete') {
        setPhase('complete')
      }
    } catch (err) {
      setEvents((prev) => [...prev, { event: 'error', message: err.message }])
      setPhase('complete')
    }
  }

  const handleReset = () => {
    setPhase('search')
    setEvents([])
    setFinalReport(null)
    setSearchedCompany('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {phase === 'search' && (
          <CompanySearch onResearch={handleResearch} />
        )}

        {phase === 'researching' && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <h2 className="text-xl font-semibold text-gray-200">
                Researching <span className="text-brand-400">{searchedCompany}</span>…
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                6 AI agents working in parallel — this takes 2–4 minutes
              </p>
            </div>
            <AgentTimeline events={events} />
          </div>
        )}

        {phase === 'complete' && (
          <div className="space-y-6">
            <AgentTimeline events={events} compact />
            {finalReport ? (
              <CompanyReport report={finalReport} companyName={searchedCompany} onReset={handleReset} />
            ) : (
              <div className="bg-gray-900 border border-red-800 rounded-2xl p-8 text-center">
                <p className="text-red-400 text-lg font-medium">Research failed</p>
                <p className="text-gray-500 mt-2 text-sm">Check the agent timeline above for errors.</p>
                <button
                  onClick={handleReset}
                  className="mt-6 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
