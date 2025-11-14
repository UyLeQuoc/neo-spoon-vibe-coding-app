import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare'
import { useLoaderData } from '@remix-run/react'
import { useEffect, useRef } from 'react'

export async function loader(args: LoaderFunctionArgs) {
  if (!args.params.id) {
    return json({ error: 'Invalid preview ID' }, { status: 400 })
  }

  return { previewId: args.params.id }
}

export default function Preview() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const data = useLoaderData<typeof loader>()
  useEffect(() => {
    if (iframeRef.current && 'previewId' in data) {
      iframeRef.current.src = `https://${data.previewId}.local-corp.webcontainer-api.io`
    }
  }, [data])

  if ('error' in data) {
    return <div className="text-red-500">Error: {data.error}</div>
  }
  return (
    <div className="w-full h-full">
      <iframe ref={iframeRef} />
    </div>
  )
}
