import { useEffect, useRef } from 'react'
import { createSwarm } from '../lab/swarm/src/swarm.js'
import { defaults } from '../lab/swarm/src/params.js'
import { createBrushLayer } from '../lab/swarm/src/brush-layer.js'
import { createCircleTool } from '../lab/swarm/src/circle-tool.js'
// Full param set exported from the lab/swarm prototype ("copy params"). Defaults fill in
// anything a newer prototype adds that this export doesn't have yet.
import SITE_PARAMS from './swarm-params.json'

// Full-screen interactive swarm. Elements marked [data-swarm-ignore] (the UI) don't steer
// the balls or start circles.
export function SwarmCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const params = { ...defaults, ...SITE_PARAMS }
    const swarm = createSwarm(canvas, params, { brushLayer: createBrushLayer(params) })
    const circles = createCircleTool(canvas, swarm, params)
    swarm.start()
    return () => {
      circles.destroy()
      swarm.destroy()
    }
  }, [])

  return <canvas ref={ref} className="swarm" aria-hidden="true" />
}
