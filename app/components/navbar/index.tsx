'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import cn from 'classnames'
import s from './navbar.module.css'

const Navbar = () => {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Default', desc: '经典版' },
    { href: '/cool', label: 'Editorial', desc: '杂志风' },
  ]

  return (
    <nav className={s.navbar}>
      <div className={s.inner}>
        {/* Logo / Brand */}
        <div className={s.brand}>
          <div className={s.logoMark} />
          <span className={s.brandText}>Text Generator</span>
        </div>

        {/* Nav Links */}
        <div className={s.navLinks}>
          {navItems.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(s.navLink, isActive && s.navLinkActive)}
              >
                <span className={s.navLinkLabel}>{item.label}</span>
                <span className={s.navLinkDesc}>{item.desc}</span>
              </Link>
            )
          })}
        </div>

        {/* Right spacer for balance */}
        <div className={s.spacer} />
      </div>
    </nav>
  )
}

export default Navbar
