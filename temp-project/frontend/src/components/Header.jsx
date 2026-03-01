import { Target, Zap } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500/20 border border-brand-500/30 rounded-lg flex items-center justify-center">
            <Target size={16} className="text-brand-400" />
          </div>
          <div>
            <span className="font-bold text-gray-100 tracking-tight">Sales Copilot</span>
            <span className="ml-2 text-xs text-gray-500 hidden sm:inline">Company Intelligence</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Zap size={12} className="text-brand-400" />
          <span>Powered by Amazon Bedrock</span>
        </div>
      </div>
    </header>
  )
}
