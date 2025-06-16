const IS_SERVER_ENV = (typeof window === 'undefined')

export async function loadAud(src) {
    if(IS_SERVER_ENV) return
    const res = await fetch(src)
    return await res.arrayBuffer()
}

export class AudioEngine {
    constructor(game) {
        if(IS_SERVER_ENV) return
        this.game = game
    }

    getContext() {
        return this.context ||= new (window.AudioContext || window.webkitAudioContext)()
    }

    async playSound(aud, volume = 1.0, loop = false) {
        if(IS_SERVER_ENV) return

        const ctx = this.getContext()
  
        const sound = ctx.createBufferSource()
        aud.data ||= ctx.decodeAudioData(aud.raw)
        sound.buffer = await aud.data
      
        const gainNode = ctx.createGain()
        gainNode.gain.value = volume
  
        sound.connect(gainNode)
        gainNode.connect(ctx.destination)
  
        if(loop) sound.loop = true
  
        sound.start()

        return sound
    }
}