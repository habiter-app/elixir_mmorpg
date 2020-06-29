import Preloader from "./preloader"
import { FBXLoader } from "./vendor/FBXLoader"
import { rotateAboutCenter } from "./geometry"

class Game{
    // preload game assets
    constructor(){
	  const game = this;
	  this.player = { };
	  this.modes = Object.freeze({
		NONE: Symbol("none"),
		INIT: Symbol("init"),
		ACTIVE: Symbol("active")
	  })
	  this.mode = this.modes.NONE;

	  const options = {
		assets: [],
		oncomplete: function(){
		  game.init();
		  game.animate();
		}
	  }

	  // first animation is set as soon as the character is spawned
	  this.animations = ["standing", "walking", "dancing"]
	  this.assetsPath = 'fbx/';
	  this.animations.forEach( function(animation){ options.assets.push(
		`${game.assetsPath}${animation}.fbx`
	  )})

	  this.clock = new THREE.Clock();
	  const preloader = new Preloader(options)

	  window.onError = function(error){
		console.error(JSON.stringify(error));
	  }
    }

	// initialises the game scene, camera and objects
    init(){
	    this.mode = this.modes.INIT;

		// scene setup, light camera and background.
        this.scene = new THREE.Scene();
	    this.scene.background = new THREE.Color( 0x2edaff  );

		// grid helper
	    var size = 1000;
		var divisions = 10;
		var gridHelper = new THREE.GridHelper( size, divisions );
		//this.scene.add( gridHelper );

        let light = new THREE.HemisphereLight( 0xffffff, 0x444444, 1 );
        light.position.set( 0, 500, 0 );
        this.scene.add( light );
 
        light = new THREE.DirectionalLight( 0xffffff, 0.1 );
        light.position.set( 0, 200, 100 );
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.top = 3000;
        light.shadow.camera.bottom = -3000;
        light.shadow.camera.left = -3000;
        light.shadow.camera.right = 3000;
        light.shadow.camera.far = 3000;
        this.scene.add( light );

        // ground
		/*
        var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry    ( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999,     depthWrite: false } ) );
        mesh.rotation.x = - Math.PI / 2;
        //mesh.position.y = -100;
        mesh.receiveShadow = true;
        this.scene.add( mesh );
		*/

	    var light_2 = new THREE.PointLight( 0x000000, 1, 100 );
	    light_2.position.set( 50, 50, 50 );
	    this.scene.add( light_2 );

		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 10000 );
	    this.camera.position.set(112, 100, 200);
	    this.camera.quaternion.set(0.07133122876303646, -0.17495722675648318,     -0.006135162916936811, -0.9819695435118246);

		this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        document.getElementById("renderer").appendChild( this.renderer.domElement );

		// model setup
	    const loader = new THREE.FBXLoader();
	    const game = this
		// bootup model with the first animation
	    loader.load( `${this.assetsPath}${this.animations[0]}.fbx`,
		  function (object) {
			object.mixer = new THREE.AnimationMixer( object );
			game.player.mixer = object.mixer;
			game.player.root = object.mixer.getRoot();
			const first_action = game.player.mixer.clipAction( object.animations[0] )
			first_action.play()

			object.name = "Character"
			game.player.object = object
			object.traverse( function (child){
			  if ( child.isMesh ) {
				child.castShadow = true;
				child.receiveShadow = true;
			  }
			});

			game.scene.add(object)
			game.mode = game.modes.ACTIVE;
		})

		// load remaining animations
		this.animations.forEach(function(animation){
		  loader.load( `${game.assetsPath}${animation}.fbx`, function(object){
			game.player[animation] = object.animations[0]
		  })
		})

	  //setup keybindings
	  game.player.move = {forward: 0, direction: 0}
	  document.addEventListener("keydown", event => {
		console.log(event);
		console.log(game.player.object.rotation);
		console.log(game.player.object.position);
		console.log(game.player.object.quaternion);
		if (event.code === "KeyW"){
		  game.player.move.forward = 1;
		  game.action = 'walking';
		}
		if (event.code === "Space"){
		  game.action = 'dancing';
		}
		if (event.code === "KeyA") game.player.move.direction = 3;
		if (event.code === "KeyD") game.player.move.direction = -3;
	  })
	  document.addEventListener("keyup", event => {
		if (event.code === "KeyW"){
		  game.player.move.forward = 0;
		  game.action = 'standing';
		}
		if (event.code === "KeyA") game.player.move.direction = 0;
		if (event.code === "KeyD") game.player.move.direction = 0;
	  })

	  game.loadEnvironment(loader);
	}

	loadEnvironment(loader){
	  const game = this;
	  loader.load( `${this.assetsPath}game_environment.fbx`, function(object){
		game.scene.add(object);
		object.receiveShadow = true;
		object.name = "Environment"
		//object.scale.set(0.6, 0.6, 0.6);
		object.rotateY( Math.PI );
		object.position.y = -20
        object.traverse( function ( child ) {
            if ( child.isMesh ) {
                    child.castShadow = true;
                    child.receiveShadow = true;
			}});
		 game.environmentProxy = object;
	  });
	}

    set action(name){
	  const animation = this.player[name]
	  const action = this.player.mixer.clipAction( animation );
	  action.time = 0
	  this.player.mixer.stopAllAction();
	  this.player.action = name;
	  //action.fadeIn(0.1);
	  action.play();
	}

	animate() {
        const game = this;
		const dt = this.clock.getDelta();

        requestAnimationFrame( function(){ game.animate(); } );
	   
	    if (this.player.mixer != undefined && this.mode == this.modes.ACTIVE){
		  this.player.mixer.update(dt);
		}

		if (this.player.object != undefined){
		  // player object translations
		  if (this.player.move.forward > 0) this.moveForward(dt);
		  this.player.object.rotation.y +=  (this.player.move.direction * dt);

		  // camera tracking
		  var player_position = this.player.object.position.clone();
		  var camera_position = this.player.object.position.clone();
		  var camera_distance = 500
		  var camera_angle = (Math.PI / 4) + this.player.object.rotation.x
		  camera_position.y += Math.sin(camera_angle) * (camera_distance - 150)
		  camera_position.z -= Math.cos(camera_angle) * camera_distance
		  this.camera.position.set(camera_position.x, camera_position.y, camera_position.z)
		  this.camera.lookAt(player_position);
        }

        this.renderer.render( this.scene, this.camera );
    }

    moveForward(dt){

	  /* raycasting (object collision) */
	  const player_position = this.player.object.position.clone();
	  let dir = this.player.object.getWorldDirection();
	  let raycaster_foot = new THREE.Raycaster(player_position, dir);
	  player_position.y += 1
	  let raycaster_head = new THREE.Raycaster(player_position, dir);
	  let blocked = false;

	  for(let box of this.environmentProxy.children){
		const intersect_foot = raycaster_foot.intersectObject(box);
		const intersect_head = raycaster_foot.intersectObject(box);
		if (intersect_foot.length > 0 && intersect_foot[0].distance < 50){
		  blocked = true;
		  break;
		}
		if (intersect_head.length > 0 && intersect_head[0].distance < 50){
		  blocked = true;
		  break;
		}
	  }

	  if (blocked) return;

	  /* move on the surface of the cylinder */
	  var rotation = Math.cos(this.player.object.rotation.y)
	  var translation = Math.sin(this.player.object.rotation.y)
	  console.log(rotation, translation)
	  rotateAboutCenter(
		this.player.object,
		new THREE.Vector3(this.player.object.position.x, -2000, 0),
		THREE.Math.degToRad(5*dt*rotation)
	  );
	  this.player.object.position.x += (dt*150*translation);
	}
}

export default Game