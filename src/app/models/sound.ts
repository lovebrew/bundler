export class Sound {
  #source: HTMLAudioElement;

  constructor(source: string, loop = false) {
    this.#source = new Audio(source);
    this.#source.loop = loop;
  }

  async play() {
    this.#source.play().catch(() => {});
  }

  stop() {
    this.#source.pause();
    this.#source.currentTime = 0;
  }
}

function loadSound(src: string, loop = false): Sound {
  return new Sound(src, loop);
}
