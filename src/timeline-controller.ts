import {CONFIG} from './config';

export interface TimelineCallbacks {
  onYearChange: (year: number) => void;
}

export class TimelineController {
  private slider: HTMLInputElement;
  private ticksContainer: HTMLElement;
  private playBtn: HTMLButtonElement;
  private playIcon: HTMLElement;
  private pauseIcon: HTMLElement;

  private onYearChange: (year: number) => void;
  private isPlaying: boolean = false;
  private playTimer: number | null = null;

  constructor(callbacks: TimelineCallbacks) {
    this.slider = document.getElementById('year-slider') as HTMLInputElement;
    this.ticksContainer = document.getElementById('slider-ticks')!;
    this.playBtn = document.getElementById(
      'play-pause-btn',
    ) as HTMLButtonElement;
    this.playIcon = document.getElementById('play-icon')!;
    this.pauseIcon = document.getElementById('pause-icon')!;

    this.onYearChange = callbacks.onYearChange;

    this.slider.min = CONFIG.START_YEAR.toString();
    this.slider.max = CONFIG.END_YEAR.toString();
    this.slider.value = CONFIG.END_YEAR.toString();

    this.renderTicks();
    this.updateActiveState(CONFIG.END_YEAR);

    this.slider.addEventListener('input', e => {
      if (this.isPlaying) this.pause();
      const year = parseInt((e.target as HTMLInputElement).value, 10);
      this.updateActiveState(year);
      this.onYearChange(year);
    });

    this.playBtn.addEventListener('click', () => this.togglePlay());
  }

  private renderTicks(): void {
    this.ticksContainer.innerHTML = '';

    for (let year = CONFIG.START_YEAR; year <= CONFIG.END_YEAR; year++) {
      const tickEl = document.createElement('div');
      tickEl.className = 'tick-item';
      tickEl.dataset.year = year.toString();

      const mark = document.createElement('div');
      mark.className = 'tick-mark';

      const label = document.createElement('span');
      label.className = 'tick-label';

      tickEl.appendChild(mark);
      tickEl.appendChild(label);
      this.ticksContainer.appendChild(tickEl);
    }
  }

  private updateActiveState(activeYear: number): void {
    const allTicks = this.ticksContainer.querySelectorAll('.tick-item');

    allTicks.forEach(tick => {
      const tickEl = tick as HTMLElement;
      const tickYear = parseInt(tickEl.dataset.year || '0', 10);
      const label = tickEl.querySelector('.tick-label') as HTMLElement;

      if (tickYear === activeYear) {
        tickEl.classList.add('active');
        label.textContent = tickYear.toString(); // Full 4-digit for active tick
      } else {
        tickEl.classList.remove('active');
        const isFirstOrLast =
          tickYear === CONFIG.START_YEAR || tickYear === CONFIG.END_YEAR;
        label.textContent = isFirstOrLast
          ? tickYear.toString()
          : (tickYear % 100).toString().padStart(2, '0'); // 2-digit for inactive
      }
    });
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play(): void {
    this.isPlaying = true;
    this.playIcon.classList.add('hidden');
    this.pauseIcon.classList.remove('hidden');

    this.playTimer = window.setInterval(() => {
      let nextYear = parseInt(this.slider.value, 10) + 1;
      if (nextYear > CONFIG.END_YEAR) {
        nextYear = CONFIG.START_YEAR;
      }
      this.slider.value = nextYear.toString();
      this.updateActiveState(nextYear);
      this.onYearChange(nextYear);
    }, 2500); // Advance every 2.5s to allow WebGL route load
  }

  public pause(): void {
    this.isPlaying = false;
    this.playIcon.classList.remove('hidden');
    this.pauseIcon.classList.add('hidden');

    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  public setYear(year: number): void {
    this.slider.value = year.toString();
    this.updateActiveState(year);
    this.onYearChange(year);
  }
}
