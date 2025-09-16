import './style.css'

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);
camera.position.setX(-3);

renderer.render(scene, camera);

//Shader options
function updateShaderOptions(shaderType, material) {
  const optionsDiv = document.getElementById('shader-options');
  optionsDiv.innerHTML = ''; // clear old controls

  if (shaderType === 'checker') {
    const label = document.createElement('label');
    label.textContent = 'Tile count:';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 1;
    slider.max = 50;
    slider.value = material.uniforms.u_tiles.value;
    slider.addEventListener('input', () => {
      material.uniforms.u_tiles.value = parseFloat(slider.value);
    });
    optionsDiv.appendChild(label);
    optionsDiv.appendChild(slider);
  }

  if (shaderType === 'stars') {
    const label = document.createElement('label');
    label.textContent = 'Star density:';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 1;
    slider.max = 100;
    slider.value = material.uniforms.u_density.value;
    slider.addEventListener('input', () => {
      material.uniforms.u_density.value = parseFloat(slider.value);
    });
    optionsDiv.appendChild(label);
    optionsDiv.appendChild(slider);
  }

  if (shaderType === 'wave') {
    const label = document.createElement('label');
    label.textContent = 'Frequency:';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 100;
    slider.value = material.uniforms.u_freq.value;
    slider.addEventListener('input', () => {
      material.uniforms.u_freq.value = parseFloat(slider.value);
    });
    optionsDiv.appendChild(label);
    optionsDiv.appendChild(slider);
  }
}

//Shaders

const uniforms = {
  u_time: { value: 0.0 }
};

function getShader(type) {
  switch (type) {
    case 'stars':
      return new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0.0 },
          u_density: { value: 10.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float u_time;
          uniform float u_density;
          varying vec2 vUv;

          float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453);
          }

          void main() {
            float threshold = 1.0 - (u_density / 200.0);
            float stars = step(threshold, random(vUv * 50.0));
            gl_FragColor = vec4(vec3(stars), 1.0);
          }
        `
      });

    case 'checker':
      return new THREE.ShaderMaterial({
        uniforms: {
          u_tiles: { value: 5.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float u_tiles;
          varying vec2 vUv;
          void main() {
            float cx = step(0.5, fract(vUv.x * u_tiles));
            float cy = step(0.5, fract(vUv.y * u_tiles));
            float checker = mod(cx + cy, 2.0);
            gl_FragColor = vec4(vec3(checker), 1.0);
          }
        `
      });

    case 'wave':
    default:
      return new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0.0 },
          u_freq: { value: 10.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float u_time;
          uniform float u_freq;
          varying vec2 vUv;
          void main() {
            vec2 uv = vUv;
            uv.y += 0.2 * sin(uv.x * u_freq + u_time);
            vec3 color = vec3(uv, sin(u_time));
            gl_FragColor = vec4(color, 1.0);
          }
        `
      });
  }
}

let currentShader = 'wave';
document.getElementById('shader').addEventListener('change', (e) => {
  currentShader = e.target.value;
  createShape(document.getElementById('shape').value); 
});



let mesh;
function createShape(type) {
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
  }

  let geometry;
  switch(type) {
    case 'torus':
      geometry = new THREE.TorusGeometry(10, 3, 16, 100);
      break;
    case 'cube':
      geometry = new THREE.BoxGeometry(12, 12, 12);
      break;
    case 'pretzel':
      geometry = new THREE.TorusKnotGeometry(4, 2, 128, 100);
      break;
    default: 
      geometry = new THREE.SphereGeometry(12, 32, 32);
  }

  const material = getShader(currentShader);
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  updateShaderOptions(currentShader, material);
}

createShape('cube');

// === Handle selector change ===
document.getElementById('shape').addEventListener('change', (e) => {
  createShape(e.target.value);
});


//adding light
const pointLight = new THREE.PointLight(0xffffff, 100);
pointLight.position.set(10, 10, 10);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const gridCheckbox = document.getElementById('grid-enabled');

let gridHelper = null;

gridCheckbox.addEventListener('change', () => {
  if (gridCheckbox.checked) {
    if (!gridHelper) {
      gridHelper = new THREE.GridHelper(1000, 100);
      scene.add(gridHelper);
    }
  } else {
    if (gridHelper) {
      scene.remove(gridHelper);
      gridHelper = null; 
    }
  }
});





//add controls
const controls = new OrbitControls(camera, renderer.domElement);

const spinCheckbox = document.getElementById('spin');

// render loop
function animate() {
  requestAnimationFrame(animate);

  if (mesh.material.uniforms.u_time) {
    mesh.material.uniforms.u_time.value = performance.now() / 1000;
  }

  if (spinCheckbox.checked) {
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;
    mesh.rotation.z += 0.01;
  }


  controls.update();
  renderer.render(scene, camera);
}

animate()