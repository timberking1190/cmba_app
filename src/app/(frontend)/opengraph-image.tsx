import { ImageResponse } from 'next/og'

/*
 * Generated social share image (Open Graph + Twitter) for the public site. Rendered
 * on the fly so there is no binary asset to maintain, on brand (Calgary black and
 * red). Uses system fonts, so no font file is fetched at render time.
 *
 * Copy rule: no em or en dashes anywhere.
 */
export const runtime = 'nodejs'
export const alt = 'CMBA Connect, Calgary Minor Basketball Association'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#08080A',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', width: '120px', height: '10px', background: '#EB1C24', marginBottom: '32px' }} />
        <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, color: '#F1F1ED', letterSpacing: '-2px', lineHeight: 1 }}>
          CMBA CONNECT
        </div>
        <div style={{ display: 'flex', fontSize: 34, color: '#9A9AA2', marginTop: '28px', maxWidth: '900px' }}>
          Calgary Minor Basketball. Rules, schedule, standings, and coaching pathways.
        </div>
      </div>
    ),
    { ...size },
  )
}
