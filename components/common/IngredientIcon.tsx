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
  // DISABLED: Icon generation temporarily disabled until style is finalized
  // const [url, setUrl] = React.useState<string | null>(null)
  // const [status, setStatus] = React.useState<'ready' | 'pending'>('pending')
  // const [forceRefreshToken, setForceRefreshToken] = React.useState(0)
  // const [hasForcedRegenerate, setHasForcedRegenerate] = React.useState(false)

  // React.useEffect(() => {
  //   let alive = true
  //   setStatus('pending')
  //   setUrl(null)

  //   async function checkOnce(force = false) {
  //     try {
  //       const r = await fetchIngredientIcon(slug, displayName, force)
  //       if (!alive) return
  //       console.log(`🔄 Icon status for "${slug}":`, r.status, r.image_url ? 'URL present' : 'No URL')
  //       setStatus(r.status)
  //       setUrl(r.image_url)
  //       return r.status === 'ready' && !!r.image_url
  //     } catch (err) {
  //       if (!alive) return false
  //       console.error(`❌ Icon fetch error for "${slug}":`, err)
  //       setStatus('pending')
  //       return false
  //     }
  //   }

  //   async function pollUntilReady(timeoutMs = 15000, intervalMs = 1000) {
  //     const start = Date.now()
  //     // First call also kicks the generator via the Edge Function
  //     if (await checkOnce(forceRefreshToken > 0)) return
  //     while (alive && Date.now() - start < timeoutMs) {
  //       await new Promise((r) => setTimeout(r, intervalMs))
  //       const done = await checkOnce()
  //       if (done) return
  //     }
  //   }

  //   pollUntilReady()
  //   return () => { alive = false }
  // }, [slug, displayName, forceRefreshToken])

  // React.useEffect(() => {
  //   setHasForcedRegenerate(false)
  // }, [slug, displayName])

  // if (status === 'ready' && url) {
  //   return (
  //     <View style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden' }}>
  //       <Image 
  //         source={{ uri: url }} 
  //         style={{ width: size, height: size }} 
  //         resizeMode="contain"
  //         onError={(error) => {
  //           console.error('❌ Image load error for', slug, ':', error.nativeEvent.error)
  //           setStatus('pending')
  //           setUrl(null)
  //           if (!hasForcedRegenerate) {
  //             setHasForcedRegenerate(true)
  //             setForceRefreshToken((token) => token + 1)
  //           }
  //         }}
  //         onLoad={() => {
  //           console.log('✅ Image loaded successfully:', slug, url)
  //         }}
  //       />
  //     </View>
  //   );
  // }

  // Always show placeholder until icon generation is re-enabled
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderRadius: 12, overflow: 'hidden' }}>
      <LoadingSvg width={size} height={size} {...placeholderProps} style={{ borderRadius: 12 }} />
    </View>
  )
}

export default IngredientIcon
