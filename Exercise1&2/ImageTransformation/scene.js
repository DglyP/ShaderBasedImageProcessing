
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/libs/lil-gui.module.min';
import Stats from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/libs/stats.module';
import { WEBGL } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/WebGL.js';

var camera, controls, scene, renderer, container;
var context, canvas;
var cleanSource, processedImage;

//VIDEO AND THE ASSOCIATED TEXTURE
var video, videoTexture;
var imageProcessing, imageProcessingMaterial;
var sourceHeight, sourceWidth;

// GUI
var gui;

gui = new GUI();
const stats = Stats()
var panelType = 1;
document.body.appendChild(stats.dom)
stats.showPanel( panelType ); // 0: fps, 1: ms, 2: mb, 3+: custom
const performancePanel = {
	typeOfPanel: 1,
}
gui.add( performancePanel, 'typeOfPanel', 0, 2 ).step(1).name("Performance Panel").onChange( value => {
	stats.showPanel(value)
} );

init();
animate();

// Function for processing Image
function IVimageProcessing ( height, width, imageProcessingMaterial){
	this.height = height;
	this.width = width;

	// 3 rtt setup
	this.scene = new THREE.Scene();
	this.orthoCamera = new THREE.OrthographicCamera(-1,1,1,-1,1/Math.pow( 2,53 ), 1);

	//4 create a target texture
	var options = {
	minFilter: THREE.NearestFilter,
	magFilter: THREE.NearestFilter,
	format: THREE.RGBAFormat,
	//            type:THREE.FloatType
	type:THREE.UnsignedByteType
	};
	this.rtt = new THREE.WebGLRenderTarget( width, height, options);

	var geom = new THREE.BufferGeometry();
	geom.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,-1, 0, 1, 1, 0, -1,1,0 ]), 3 ) );
	this.scene.add( new THREE.Mesh( geom, imageProcessingMaterial ) );
}

function IVprocess ( imageProcessing, renderer )
{
renderer.setRenderTarget( imageProcessing.rtt );
renderer.render ( imageProcessing.scene, imageProcessing.orthoCamera ); 	
renderer.setRenderTarget( null );
};

function frameProcessing (texture, height, width){
		imageProcessingMaterial = new THREE.RawShaderMaterial({
			uniforms: {
				image: {type: "t", value: texture},
				scaleX: {type: "f", value: 1.0},
				scaleY: {type: "f", value: 1.0},
				scaleFactor: {type: "f", value: 1.0},
				bilinearFiltering: {type: "bool", value: true},
				interpolation: {type: "i", value: 0},
				resolution: {type: "2f", value: new THREE.Vector2( width, height)},
				colorScaleR: { type: 'f', value: 1.0 },
				colorScaleG: { type: 'f', value: 1.0 },
				colorScaleB: { type: 'f', value: 1.0 },
			},
			vertexShader: document.
				getElementById('vertexShader').text,
			fragmentShader: document.
				getElementById('fragShader').text,
			side: THREE.DoubleSide,
			glslVersion: THREE.GLSL3
		});

		imageProcessing = new IVimageProcessing(height, width, imageProcessingMaterial);
			
			var geometry = new THREE.PlaneGeometry( 1, height/width );
			var material = new THREE.MeshBasicMaterial( { map: texture, side : THREE.DoubleSide } );
			cleanSource = new THREE.Mesh( geometry, material );
			cleanSource.receiveShadow = false;
			cleanSource.castShadow = false;
			scene.add( cleanSource );

			var geometry2 = new THREE.PlaneGeometry( 1, height/width );
			var material2 = new THREE.MeshBasicMaterial( { map: imageProcessing.rtt.texture, side : THREE.DoubleSide } );
			processedImage = new THREE.Mesh( geometry2, material2 );
			processedImage.receiveShadow = false;
			processedImage.castShadow = false;
			// Organize Planes so scene looks good
			cleanSource.position.set(-0.55,0,-0.5);
			processedImage.position.set(0.55,0,-0.5);
			scene.add( processedImage );

			gui.add( imageProcessingMaterial.uniforms.scaleFactor, 'value', 1, 8 ).step(1)
			.name("Scale Factor").onChange( value => {
				imageProcessing.rtt.setSize(value * width, value * height);
				scene.remove( processedImage );
				var scaledGeometry = new THREE.PlaneGeometry( value, value * height/width );
				processedImage = new THREE.Mesh( scaledGeometry, material2 );
				processedImage.position.set(0.55,0,-0.5);
				scene.add(processedImage);
			} );
			gui
			.add(imageProcessingMaterial.uniforms.bilinearFiltering, "value")
			.name("Interp. Method");

}

function init () {
	
    if ( WEBGL.isWebGL2Available() === false ) {
		document.body.appendChild( WEBGL.getWebGL2ErrorMessage() );
	}	
    container = document.createElement( 'div' );
	document.body.appendChild( container );
    canvas = document.createElement( 'canvas' );
	context = canvas.getContext( 'webgl2' );
	document.body.appendChild( canvas );
	scene = new THREE.Scene(); 

	renderer = new THREE.WebGLRenderer( {  canvas: canvas, context: context});//, antialias: true, alpha: true } );
	renderer.autoClear = false;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = false;
	container.appendChild( renderer.domElement );
	
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.001, 10 );
	camera.position.z = 0.7;
	controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 0.005;
	controls.maxDistance = 1.0;
	controls.enableRotate = true;
	controls.addEventListener( 'change', render );
	controls.update();

	//Query from URL
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	const sourceType = urlParams.get('sourceimage');
	console.log("You have provided a " + sourceType + " parameter");

	//Futuristic Scene
	var envSphere = new THREE.SphereGeometry( 5, 60, 40 );
	var material2 = new THREE.MeshBasicMaterial( {
		map: new THREE.TextureLoader().load( '../../../assets/city.jpg' ), side : THREE.DoubleSide
	} );
	var environment = new THREE.Mesh( envSphere, material2 );
	environment.rotation.y = THREE.MathUtils.degToRad(90);
	scene.add( environment );
	
	
	//Decide which type of file we are using - image || video || webcam
	if (sourceType == "webcam"){

		if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
			const constraints = { video: { width: 1920, height: 1080, facingMode: 'user' } };
			navigator.mediaDevices.getUserMedia( constraints ).then( function ( stream ) 
			{
			video = document.createElement('video');
			video.srcObject = stream;
			video.play();
            video.onloadeddata = function () {
                videoTexture = new THREE.VideoTexture(video);
                videoTexture.wrapS = videoTexture.wrapT = THREE.RepeatWrapping;
                videoTexture.minFilter = THREE.NearestFilter;
                videoTexture.magFilter = THREE.NearestFilter;
                videoTexture.generateMipmaps = false;
                videoTexture.format = THREE.RGBFormat;        
                sourceHeight = video.videoHeight;
                sourceWidth = video.videoWidth;
                frameProcessing(videoTexture, sourceHeight, sourceWidth);
            }            
			})}

	}
	else if(sourceType == "video"){
		
		video = document.createElement('video');
		video.src = '../../../assets/video.mp4';
		video.load();
		video.muted = true;
		video.loop = true;
        video.play();
        video.onloadeddata = function () {
            videoTexture = new THREE.VideoTexture( video );
            videoTexture.minFilter = THREE.NearestFilter;
            videoTexture.magFilter = THREE.NearestFilter;
            videoTexture.generateMipmaps = false; 
            videoTexture.format = THREE.RGBFormat;      
            sourceHeight = video.videoHeight;
            sourceWidth = video.videoWidth;
            frameProcessing(videoTexture, sourceHeight, sourceWidth);
        }            

	}
	else if(sourceType == "image"){
		const loader = new THREE.TextureLoader();
                loader.load('../../../assets/grenouille.jpg', function(texture){
                    sourceHeight = texture.image.height;
                    sourceWidth = texture.image.width;
					frameProcessing(texture, sourceHeight, sourceWidth);
				} );
	}
	else{	
		const loader = new THREE.TextureLoader();
                loader.load('../../../assets/grenouille.jpg', function(texture){
					sourceHeight = texture.image.height;
                    sourceWidth = texture.image.width;
					frameProcessing(texture, sourceHeight, sourceWidth);
				} );	
	}
	
	window.addEventListener( 'resize', onWindowResize, false );

}

function render () {
	renderer.clear();
	
	if (typeof imageProcessing !== 'undefined') 
		IVprocess ( imageProcessing, renderer );
	renderer.render( scene, camera );
	
}

function animate() {	
	requestAnimationFrame(animate);
	controls.update();
	render();
    stats.update()
}

function onWindowResize () {
	camera.aspect = ( window.innerWidth / window.innerHeight);
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}