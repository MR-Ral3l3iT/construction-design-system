'use client'

import { use } from 'react'
import { SiteProjectHub } from './SiteProjectHub'

interface Props {
  params: Promise<{ id: string }>
}

export default function SiteProjectPage({ params }: Props) {
  const { id } = use(params)
  return <SiteProjectHub id={Number(id)} />
}
