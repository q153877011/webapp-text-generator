import { getLocaleOnServer } from '@/i18n/server'
import Navbar from '@/app/components/navbar'

import './styles/globals.css'
import './styles/markdown.scss'

const LocaleLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const locale = getLocaleOnServer()
  return (
    <html lang={locale ?? 'en'} className="h-full">
      <body className="h-full">
        <Navbar />
        <div className="overflow-x-auto" style={{ paddingTop: '48px' }}>
          <div className="w-screen min-w-[300px]" style={{ height: 'calc(100vh - 48px)' }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}

export default LocaleLayout
