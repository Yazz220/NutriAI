import React from 'react'
import { Image, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'
import LoadingSvg from '../../assets/images/loading-buffer.svg'
import { fetchIngredientIcon } from '../../utils/iconApi'

export type IngredientIconProps = {
  slug: string
  displayName?: string
  size?: number
  // Optional: override placeholder SVG props
  placeholderProps?: SvgProps
}

export function IngredientIcon({ slug, displayName, size = 32, placeholderProps }: IngredientIconProps) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<'ready' | 'pending'>('pending')

  React.useEffect(() => {
    let alive = true
    setStatus('pending')
    setUrl(null)

    async function checkOnce() {
      try {
        const r = await fetchIngredientIcon(slug, displayName)
        if (!alive) return
        setStatus(r.status)
        setUrl(r.image_url)
        return r.status === 'ready' && !!r.image_url
      } catch {
        if (!alive) return false
        setStatus('pending')
        return false
      }
    }

    async function pollUntilReady(timeoutMs = 15000, intervalMs = 1000) {
      const start = Date.now()
      // First call also kicks the generator via the Edge Function
      if (await checkOnce()) return
      while (alive && Date.now() - start < timeoutMs) {
        await new Promise((r) => setTimeout(r, intervalMs))
        const done = await checkOnce()
        if (done) return
      }
    }

    pollUntilReady()
    return () => { alive = false }
  }, [slug, displayName])

  if (status === 'ready' && url) {
    return (
      <View style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden' }}>
        <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="contain" />
      </View>
    );
  }

  // Pending: show inline SVG placeholder
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderRadius: 12, overflow: 'hidden' }}>
      <LoadingSvg width={size} height={size} {...placeholderProps} style={{ borderRadius: 12 }} />
    </View>
  )
}

export default IngredientIcon
