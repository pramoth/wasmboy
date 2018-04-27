import { Component } from 'preact';
import Promise from 'promise-polyfill';
import './wasmboyBackgroundMap.css';

export class WasmBoyBackgroundMap extends Component {
  constructor(props) {
		super(props);
  }

  componentDidMount() {
    const canvasElement = document.getElementById('WasmBoyBackgroundMap');
    const canvasContext = canvasElement.getContext('2d');
    const canvasImageData = canvasContext.createImageData(256, 256);

    // Add some css for smooth 8-bit canvas scaling
    // https://stackoverflow.com/questions/7615009/disable-interpolation-when-scaling-a-canvas
    // https://caniuse.com/#feat=css-crisp-edges
    canvasElement.style = `
      image-rendering: optimizeSpeed;
      image-rendering: -moz-crisp-edges;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: -o-crisp-edges;
      image-rendering: pixelated;
      -ms-interpolation-mode: nearest-neighbor;
    `;

    // Fill the canvas with a blank screen
    // using client width since we are not requiring a width and height oin the canvas
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/clientWidth
    // TODO: Mention respopnsive canvas scaling in the docs
    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);

    const updateBackgroundMap = () => {
      this.updateBackgroundMap(canvasElement, canvasContext, canvasImageData).then(() => {
        setTimeout(() => {
          updateBackgroundMap();
        }, 500);
      });
    }
    updateBackgroundMap();
  }

  updateBackgroundMap(canvasElement, canvasContext, canvasImageData) {
    return new Promise((resolve) => {

      // Dont update for the following
      if(!this.props.wasmboy.wasmByteMemory ||
        !this.props.wasmboy.wasmInstance ||
        !this.props.wasmboy.ready ||
        this.props.wasmboy.paused ||
        !this.props.shouldUpdate) {
        resolve();
        return;
      }

      this.props.wasmboy.wasmInstance.exports.drawBackgroundMapToWasmMemory(1);

      const imageDataArray = new Uint8ClampedArray(256 * 256 * 4);
      const rgbColor = new Uint8ClampedArray(3);

      for(let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {

          // Each color has an R G B component
          let pixelStart = ((y * 256) + x) * 3;

          for (let color = 0; color < 3; color++) {
            rgbColor[color] = this.props.wasmboy.wasmByteMemory[
              this.props.wasmboy.wasmInstance.exports.backgroundMapLocation + pixelStart + color
            ];
          }

          // Doing graphics using second answer on:
          // https://stackoverflow.com/questions/4899799/whats-the-best-way-to-set-a-single-pixel-in-an-html5-canvas
          // Image Data mapping
          const imageDataIndex = (x + (y * 256)) * 4;

          imageDataArray[imageDataIndex] = rgbColor[0];
          imageDataArray[imageDataIndex + 1] = rgbColor[1];
          imageDataArray[imageDataIndex + 2] = rgbColor[2];
          // Alpha, no transparency
          imageDataArray[imageDataIndex + 3] = 255;
        }
      }

      // Add our new imageData
      for(let i = 0; i < imageDataArray.length; i++) {
        canvasImageData.data[i] = imageDataArray[i];
      }

      canvasContext.beginPath();
      canvasContext.clearRect(0, 0, 256, 256);
      canvasContext.putImageData(canvasImageData, 0, 0);

      // Draw a semi Transparent camera thing over the imagedata
      // https://www.html5canvastutorials.com/tutorials/html5-canvas-rectangles/
      // Get the scroll X and Y
      const scrollX = this.props.wasmboy.wasmByteMemory[this.props.getWasmBoyOffsetFromGameBoyOffset(0xFF43, this.props.wasmboy)];
      const scrollY = this.props.wasmboy.wasmByteMemory[this.props.getWasmBoyOffsetFromGameBoyOffset(0xFF42, this.props.wasmboy)];

      const lineWidth = 2;
      const strokeStyle = 'rgba(173, 140, 255, 200)';

      // Need to wrap by the four corners, not the 4 edges

      // Upper left corner
      canvasContext.rect(scrollX, scrollY, 160, 144);
      canvasContext.lineWidth = lineWidth;
      canvasContext.strokeStyle = strokeStyle;
      canvasContext.stroke();

      // Upper right corner
      if (scrollX + 160 > 256) {
        canvasContext.rect(0, scrollY, (scrollX + 160 - 256), 144);
        canvasContext.lineWidth = lineWidth;
        canvasContext.strokeStyle = strokeStyle;
        canvasContext.stroke();
      }

      // Bottom left corner
      if (scrollY + 144 > 256) {
        canvasContext.rect(scrollX, 0, 160, (scrollY + 144 - 256));
        canvasContext.lineWidth = lineWidth;
        canvasContext.strokeStyle = strokeStyle;
        canvasContext.stroke();
      }

      // Bottom right corner
      if (scrollX + 160 > 256 && scrollY + 144 > 256) {
        canvasContext.rect(0, 0, (scrollX + 160 - 256), (scrollY + 144 - 256));
        canvasContext.lineWidth = lineWidth;
        canvasContext.strokeStyle = strokeStyle;
        canvasContext.stroke();
      }

      resolve();
    });
  }

  render() {
    return (
      <div>
        <h1>Background Map</h1>
        <div class="wasmboy__backgroundMap">
          <canvas id="WasmBoyBackgroundMap" width="256" height="256">
          </canvas>
        </div>
      </div>
    )
  }
}
