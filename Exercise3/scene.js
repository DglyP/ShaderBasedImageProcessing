
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/libs/lil-gui.module.min';
import { WEBGL } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/WebGL.js';

import {arithmeticVertexShader, arithmeticFragmentShader} from "./shaders/imgArithmetic.js";
import {scalingVertexShader, scalingFragmentShader}  from "./shaders/imgScaling.js"; 
import {gaussianVertexShader, gaussianFragmentShader} from "./shaders/separableGauss.js";
import {knnVertexShader,knnFragmentShader} from "./shaders/knnDenoise.js";

var camera, controls, scene, renderer, container;
var context, canvas;
var cleanSource, processedImage;

//VIDEO AND THE ASSOCIATED TEXTURE
var video, videoTexture;
var secondImage;
var gaussianProcessing, gaussianProcessingMaterial;
var knnProcessing, knnProcessingMaterial;
var arithmeticProcessing, arithmeticProcessingMaterial;
var scaleProcessing, scaleProcessingMaterial;
var sourceHeight, sourceWidth;

// GUI
var gui;

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


		secondImage = new THREE.TextureLoader().load('../../assets/image2.jpg');
		secondImage.wrapS = secondImage.wrapT = THREE.RepeatWrapping;
		var geometry = new THREE.PlaneGeometry( 1, height/width );
		var material = new THREE.MeshBasicMaterial( { map: texture, side : THREE.DoubleSide } );
		cleanSource = new THREE.Mesh( geometry, material );
		cleanSource.receiveShadow = false;
		cleanSource.castShadow = false;
		scene.add( cleanSource );

		// GAUSS
		gaussianProcessingMaterial = new THREE.RawShaderMaterial({
			uniforms: {
				image: {type: "t", value: texture},
				sigma: {type: "f", value: 10.0},
				kernelSize: {type: "i", value: 61},
				firstpass: {type: "b", value: true},
				resolution: {type:"2f", value: new THREE.Vector2(width, height)},
				colorScaleR: { type: 'f', value: 1.0 },
				colorScaleG: { type: 'f', value: 1.0 },
				colorScaleB: { type: 'f', value: 1.0 },
			},
			vertexShader: gaussianVertexShader,
			fragmentShader: gaussianFragmentShader,
			glslVersion: THREE.GLSL3
		});
		gaussianProcessing = new IVimageProcessing(height, width, gaussianProcessingMaterial);
		var geometry2 = new THREE.PlaneGeometry( 1, height/width );
		var material2 = new THREE.MeshBasicMaterial( { map: gaussianProcessing.rtt.texture, side : THREE.DoubleSide } );
		IVprocess ( gaussianProcessing, renderer );
		// KNN

		knnProcessingMaterial = new THREE.RawShaderMaterial({
			uniforms: {
				image: {type: "t", value: texture},
				kernelSize: {type: "i", value: 10.0},
				resolution: {type: "2f", value: new THREE.Vector2( width, height)},
				colorScaleR: { type: 'f', value: 1.0 },
				colorScaleG: { type: 'f', value: 1.0 },
				colorScaleB: { type: 'f', value: 1.0 },
			},
			vertexShader: knnVertexShader,
			fragmentShader: knnFragmentShader,
			glslVersion: THREE.GLSL3
		});
		knnProcessing = new IVimageProcessing(height, width, knnProcessingMaterial);
		var geometry2 = new THREE.PlaneGeometry( 1, height/width );
		var material2 = new THREE.MeshBasicMaterial( { map: knnProcessing.rtt.texture, side : THREE.DoubleSide } );
		IVprocess ( knnProcessing, renderer );

		//Operation

		arithmeticProcessingMaterial = new THREE.RawShaderMaterial({
			uniforms: {
				scale: {type: "f", value : 1.0},
				centerX: {type: "f", value: 0.0},
				centerY: {type: "f", value: 0.0},
				image: {type: "t", value: gaussianProcessing.rtt.texture},
				image2: {type: "t", value: knnProcessing.rtt.texture},
				operation: {type: "i", value: 1},
				mergeAmount: {type: "f", value: 1.0},
				scaleFactor: {type: "f", value: 1.0},
				offset: {type:"f", value: 0.0},
				resolution: {type:"2f", value: new THREE.Vector2(width, height)},
				colorScaleR: { type: 'f', value: 1.0 },
				colorScaleG: { type: 'f', value: 1.0 },
				colorScaleB: { type: 'f', value: 1.0 },
			},
			vertexShader: arithmeticVertexShader,
			fragmentShader: arithmeticFragmentShader,
			glslVersion: THREE.GLSL3
		});
		arithmeticProcessing = new IVimageProcessing(height, width, arithmeticProcessingMaterial);
		var geometry2 = new THREE.PlaneGeometry( 1, height/width );
		var material2 = new THREE.MeshBasicMaterial( { map: arithmeticProcessing.rtt.texture, side : THREE.DoubleSide } );
		IVprocess ( arithmeticProcessing, renderer );
		console.log(arithmeticProcessing);

		//Scale

		scaleProcessingMaterial = new THREE.RawShaderMaterial({
			uniforms: {
				image: {type: "t", value: arithmeticProcessing.rtt.texture},
				scaleX: {type: "f", value: 1.0},
				scaleY: {type: "f", value: 1.0},
				scaleFactor: {type: "f", value: 1.0},
				bilinearFiltering: {type: "bool", value: true},
				steamProcess: {type: "bool", value: true},
				gaussianRoute: {type: "bool", value: false},
				knnRoute: {type: "bool", value: false},
				interpolation: {type: "i", value: 0},
				resolution: {type: "2f", value: new THREE.Vector2( width, height)},
				colorScaleR: { type: 'f', value: 1.0 },
				colorScaleG: { type: 'f', value: 1.0 },
				colorScaleB: { type: 'f', value: 1.0 },
			},
			vertexShader: scalingVertexShader,
			fragmentShader: scalingFragmentShader,
			side: THREE.DoubleSide,
			glslVersion: THREE.GLSL3
		});



		scaleProcessing = new IVimageProcessing(height, width, scaleProcessingMaterial);
		var geometry2 = new THREE.PlaneGeometry( 1, height/width );
		var material2 = new THREE.MeshBasicMaterial( { map: scaleProcessing.rtt.texture, side : THREE.DoubleSide } );
		IVprocess ( scaleProcessing, renderer );
			


			// var material3 = new THREE.MeshBasicMaterial( { map: knnFragmentShader.rtt.texture, side : THREE.DoubleSide } );
			// var material4 = new THREE.MeshBasicMaterial( { map: arithmeticProcessing.rtt.texture, side : THREE.DoubleSide } );
			// var material5 = new THREE.MeshBasicMaterial( { map: scaleProcessing.rtt.texture, side : THREE.DoubleSide } );
			processedImage = new THREE.Mesh( geometry2, material2 );
			processedImage.receiveShadow = false;
			processedImage.castShadow = false;
			// Organize Planes so scene looks good
			cleanSource.position.set(0,-0.55,-0.3);
			cleanSource.rotation.x = THREE.MathUtils.degToRad(-30);
			cleanSource.scale.set(0.5,0.5,0.5);
			processedImage.position.set(0,0,-1);


			scene.add( processedImage );
			
			//Create all the GUI for the convolutions
			gui = new GUI();
			// Controls for changes		
			gui
			.add(gaussianProcessingMaterial.uniforms.sigma, "value", 1, 10, 1)
			.listen()
			.name("Sigma");
			gui
			.add(gaussianProcessingMaterial.uniforms.kernelSize, "value", 1, 61, 1)
			.listen()
			.name("Kernel Size");
			gui
			.add(knnProcessingMaterial.uniforms.kernelSize, "value", 1, 10, 1)
			.listen()
			.name("Knn Kernel Size");
			// Image arithmetic
			gui
			.add(arithmeticProcessingMaterial.uniforms.operation, "value", {Sum: 0, Substract: 1, Multiply: 2, Divide: 3})
			.listen()
			.name("Operation");
			gui
			.add(arithmeticProcessingMaterial.uniforms.mergeAmount, "value", 0, 1)
			.listen()
			.name("Merge Amount");
			gui
			.add(arithmeticProcessingMaterial.uniforms.scaleFactor, "value", 0.1, 2)
			.listen()
			.name("Arithmetic Scale Factor")
			.step(0.2);
			gui
			.add(arithmeticProcessingMaterial.uniforms.offset, "value", -1, 1)
			.listen()
			.name("Offset")
			.step(0.2);
			gui
			.add( scaleProcessingMaterial.uniforms.scaleFactor, 'value', 1, 8 ).step(1)
			.listen()
			.name("Scaling Amount").onChange( value => {
				scaleProcessing.rtt.setSize(value * width, value * height);
				scene.remove( processedImage );
				var scaledGeometry = new THREE.PlaneGeometry( value, value * height/width );
				processedImage = new THREE.Mesh( scaledGeometry, material2 );
				processedImage.position.set(0,0,-0.5);
				scene.add(processedImage);
			} );
			gui
			.add(scaleProcessingMaterial.uniforms.bilinearFiltering, "value")
			.name("Interpolation");
			gui
			.add(scaleProcessingMaterial.uniforms.steamProcess, "value")
			.name("Steam Process")
			.listen()
			.onChange( value =>{
				gaussianProcessingMaterial.uniforms.sigma.value = 10; 
				gaussianProcessingMaterial.uniforms.kernelSize.value = 61; 
				IVprocess ( gaussianProcessing, renderer );
				arithmeticProcessingMaterial.uniforms.image.value = gaussianProcessing.rtt.texture;
				arithmeticProcessingMaterial.uniforms.image2.value = knnProcessing.rtt.texture;
				arithmeticProcessingMaterial.uniforms.mergeAmount.value = 1;
				IVprocess ( arithmeticProcessing, renderer );
				scaleProcessingMaterial.uniforms.gaussianRoute.value = !value;
				scaleProcessingMaterial.uniforms.knnRoute.value = !value;
				IVprocess ( scaleProcessing, renderer );						
			});
			gui
			.add(scaleProcessingMaterial.uniforms.gaussianRoute, "value")
			.name("Disable Knn")
			.listen()
			.onChange( value =>{
				gaussianProcessingMaterial.uniforms.sigma.value = 10; 
				gaussianProcessingMaterial.uniforms.kernelSize.value = 61; 
				IVprocess ( gaussianProcessing, renderer );
				arithmeticProcessingMaterial.uniforms.image.value = gaussianProcessing.rtt.texture;
				arithmeticProcessingMaterial.uniforms.image2.value = secondImage;		
				arithmeticProcessingMaterial.uniforms.mergeAmount.value = 1;
				IVprocess ( arithmeticProcessing, renderer );
				scaleProcessingMaterial.uniforms.gaussianRoute.value = value;
				scaleProcessingMaterial.uniforms.knnRoute.value = !value;
				scaleProcessingMaterial.uniforms.steamProcess.value = !value;
				IVprocess ( scaleProcessing, renderer );						
			});
			gui
			.add(scaleProcessingMaterial.uniforms.knnRoute, "value")
			.name("Disable Gaussian")
			.listen()
			.onChange( value =>{
				knnProcessingMaterial.uniforms.kernelSize.value = 10;
				IVprocess ( knnProcessing, renderer );
				arithmeticProcessingMaterial.uniforms.image.value = knnProcessing.rtt.texture;
				arithmeticProcessingMaterial.uniforms.image2.value = secondImage;			
				arithmeticProcessingMaterial.uniforms.mergeAmount.value = 1;
				IVprocess ( arithmeticProcessing, renderer );
				scaleProcessingMaterial.uniforms.gaussianRoute.value = !value;
				scaleProcessingMaterial.uniforms.knnRoute.value = value;
				scaleProcessingMaterial.uniforms.steamProcess.value = !value;
				// scaleProcessingMaterial.uniforms.scaleFactor = 1;
				IVprocess ( scaleProcessing, renderer );						
			});
			const stats = {
				Stats() { var script=document.createElement('script');
						script.onload=function(){
													var stats=new Stats();
													document.body.appendChild(stats.dom);
													requestAnimationFrame(function loop(){
																						stats.update();
																						requestAnimationFrame(loop)});
																					};
													script.src='//mrdoob.github.io/stats.js/build/stats.min.js';
													document.head.appendChild(script); }
			};
			
			gui.add( stats, 'Stats' );
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
	console.log(sourceType);
		
	//Futuristic Scene
	var envSphere = new THREE.SphereGeometry( 5, 60, 40 );
	var material2 = new THREE.MeshBasicMaterial( {
		map: new THREE.TextureLoader().load( '../../assets/city.jpg' ), side : THREE.DoubleSide
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
	
	if (typeof gaussianProcessing !== 'undefined') 
	IVprocess ( gaussianProcessing, renderer );
		
	if (typeof knnProcessing !== 'undefined') 
	IVprocess ( knnProcessing, renderer );
	
	if (typeof arithmeticProcessing !== 'undefined') 
	IVprocess ( arithmeticProcessing, renderer );
		
	if (typeof scaleProcessing !== 'undefined') 
	IVprocess ( scaleProcessing, renderer );
			
			
	renderer.render( scene, camera );
	
}

function animate() {	
	requestAnimationFrame(animate);
	controls.update();
	render();
}

function onWindowResize () {
	camera.aspect = ( window.innerWidth / window.innerHeight);
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}