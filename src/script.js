import BoidsController from "./common/BoidsController";
import SimpleRenderer from "./common/SimpleRenderer";
import ControlHelper from "./common/ControlHelper";

const mouseXDefaultPosition = 0;
const mouseYDefaultPosition = 0;

class Application {
  constructor() {
    this.flockEntityCount = 50;
    this.obstacleEntityCount = 10;
    this.simpleRenderer = undefined;
    this.boidsController = undefined;
    this.controlHelper = undefined;
  }

  init() {
    // create a boids controller with the given boundary [2000, 600, 2000]
    this.boidsController = new BoidsController(2000, 600, 2000);

    // create renderer and pass boidsController to render entities
    this.simpleRenderer = new SimpleRenderer({
      boidsController: this.boidsController,
    });
    this.simpleRenderer.init();

    // create control helper for example controls
    this.controlHelper = new ControlHelper(
      this.boidsController,
      this.simpleRenderer
    );
    this.controlHelper.init();

    // add initial entities for an interesting view
    this.controlHelper.addBoids(this.flockEntityCount);
    this.controlHelper.addObstacles(this.obstacleEntityCount);

    // request the first animation frame
    window.requestAnimationFrame(this.render.bind(this));
  }

  render() {
    window.requestAnimationFrame(this.render.bind(this));

    // call statBegin() to measure time that is spend in BoidsController
    this.controlHelper.statBegin();

    // console.log(this.simpleRenderer.mouseX, this.simpleRenderer.mouseY)

    // calculate boids entities
    this.boidsController.iterate(
      this.simpleRenderer.mouseX,
      this.simpleRenderer.mouseY
    );

    // update screen by rendering
    this.simpleRenderer.render();

    // call statEnd() to finalize measuring time
    this.controlHelper.statEnd();

    // this.simpleRenderer.mouseX = mouseXDefaultPosition;
    // this.simpleRenderer.mouseY = mouseYDefaultPosition;
  }
}

// create the application when the document is ready
document.addEventListener("DOMContentLoaded", new Application().init());
