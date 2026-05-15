import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  const src = readFileSync(join(process.cwd(), 'public/favicon-source.png'))
  const dataUri = `data:image/png;base64,${src.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} width={512} height={512} alt="" />
      </div>
    ),
    { width: 512, height: 512 }
  )
}
