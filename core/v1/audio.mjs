const IS_SERVER_ENV = (typeof window === 'undefined')


/**
 * The audio engine of the game.
 * It is responsible for playing sounds.
 * @param {Game} game The game instance.
 */
export class AudioEngine {
    constructor(game) {
        if(IS_SERVER_ENV) return
        this.game = game
    }

    /**
     * Returns the audio context.
     * @returns {AudioContext} The audio context.
     */
    getContext() {
        return this.context ||= new (window.AudioContext || window.webkitAudioContext)()
    }

    /**
     * Plays a sound.
     * @param {Audio} aud The audio to play.
     * @param {number} volume The volume of the sound.
     * @param {boolean} loop Whether to loop the sound.
     * @returns {AudioBufferSourceNode} The sound source.
     */
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