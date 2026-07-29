import Header from '../components/Layout/Header'

interface PlaceholderPageProps {
  title: string
  subtitle?: string
}

export default function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <div className="p-6">
        <div className="card p-16 flex items-center justify-center text-center">
          <div>
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🚧</span>
            </div>
            <p className="text-sm font-medium text-gray-600">Section under development</p>
            <p className="text-xs text-gray-400 mt-1">Coming soon</p>
          </div>
        </div>
      </div>
    </>
  )
}
