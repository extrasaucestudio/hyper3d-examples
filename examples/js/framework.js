
// The example framework used to simplify the example code.
// See simple.html for the example on how to use HYPER3D without this framework.

var THREE = require('three');
var Hyper = require('hyper3d');

function runExample(options, cb)
{
    if (cb == null) {
        cb = options;
        options = {};
    }

    if (options.pixelRatio == null) {
        options.pixelRatio = window.devicePixelRatio;
    }
    
    var queries = window.location.search.substr(1).split('&');
    for (var i = 0; i < queries.length; ++i) {
        var query = queries[i];
        var k = query.indexOf('=');
        if (k >= 0) {
            var key = unescape(query.substr(0, k));
            var value = unescape(query.substr(k + 1));
            if (key === 'by')
                options.renderer = value;
            else if (key === 'ratio') {
                value = parseFloat(value);
                if (value >= 0.1 && value <= 4)
                    options.pixelRatio = value;
            }
        }
    }

    var renderer;
    switch (options.renderer) {
        case null:
        case undefined:
        case 'hyper3d':
            renderer = new Hyper.WebGLHyperRenderer({
                useFullResolutionGBuffer: true,
                useFPBuffer: true
            });
            break;
        case 'threejs':
            renderer = new THREE.WebGLRenderer();
            break;
        default:
            $('<div class="error">')
            .text("unknown renderer specified: " + options.renderer)
            .appendTo($('body'));
            return;
    }

    var pixelRatio = options.pixelRatio;

    var stats = new Stats();

    var framework = {
        __signals: {
            resize: [],
            animate: [],
            mousedown: enableMouse,
            mousemove: enableMouse,
            mouseup: enableMouse,
        },
        on: function (eventName, cb) {
            var handlers = this.__signals[eventName];
            if (!handlers) {
                throw new Error("bad signal name: " + cb);
            }
            if (typeof handlers === 'function') {
                handlers.call(this);
                handlers = this.__signals[eventName] = [];
            }
            handlers.push(cb);
        },
        invoke: function (eventName, rest) {
            var args = Array.prototype.slice.call(arguments, 1);
            var handlers = this.__signals[eventName];
            if (typeof handlers === 'function') {
                return;
            }
            for (var i = 0; i < handlers.length; ++i) {
                handlers[i].apply(this, args);
            }
        },
        width: 0,
        height: 0,
        renderer: renderer,
        Hyper: Hyper,
        THREE: THREE,

        /** 
         * Creates a camera which can be moved by mouse.
         * @param opt.distance Default distance.
         * @return THREE.Camera
         */
        setupCamera: function (opt) {
            var distance = opt.distance;
            if (distance == null) distance = 10;

            var near = opt.near, far = opt.far, fov;
            if (near == null) near = 1;
            if (far == null) far = 100;
            if (fov == null) fov = 70;

            var camera = this.autoCameraAspect(new THREE.PerspectiveCamera(fov, 1, near, far));

            var yaw = 0.5, pitch = 0.5;

            function moveCamera()
            {
                camera.position.set(
                    Math.cos(yaw) * Math.cos(pitch) * distance,
                    Math.sin(pitch) * distance,
                    Math.sin(yaw) * Math.cos(pitch) * distance);
                camera.lookAt(new THREE.Vector3(0, 0, 0));
            }
            moveCamera();

            this.on('mousemove', function (e) {
                yaw += e.dx * 0.01;
                pitch += e.dy * 0.01;
                pitch = Math.max(Math.min(pitch, Math.PI * 0.49), Math.PI * -0.49);
                moveCamera();
            });

            return camera;
        },

        /** Makes sure the camera's aspect ratio is set correctly. */
        autoCameraAspect: function (camera) {
            function update()
            {
                camera.aspect = this.width / this.height;
                camera.updateProjectionMatrix();
            }
            update.call(this);
            this.on('resize', update);
            return camera;
        }
    }; 

    function resizeRenderer()
    {
        framework.width = $(window).width();
        framework.height = $(window).height();

        renderer.setSize( 
            framework.width * pixelRatio & ~1, 
            framework.height * pixelRatio & ~1 );

        framework.invoke('resize');
    }

    resizeRenderer();
    $(window).resize(resizeRenderer);

    renderer.domElement.className = "main";
    document.body.appendChild( renderer.domElement );
    document.body.appendChild( stats.domElement );

    // start application code
    cb(framework);

    function animate()
    {

        requestAnimationFrame( animate );

        framework.invoke('animate');

        stats.update();

    }

    function enableMouse()
    {
        var currentTouch = null;
        var lastX = 0, lastY = 0, startX = 0, startY = 0;

        $(renderer.domElement).mousecapture({
            down: function (e, data) {
                if (e.which !== 1) {
                    return;
                }
                framework.invoke('mousedown', {
                    x: e.pageX, y: e.pageY,
                    rx: 0, ry: 0,   // relative position (0 = start)
                    dx: 0, dy: 0    // delta position (0 = cursor didn't move)
                });
                data.active = true;
                data.x = data.sx = e.pageX;
                data.y = data.sy = e.pageY;
            },
            move: function (e, data) {
                if (!data.active) {
                    return;
                }
                framework.invoke('mousemove', {
                    x: e.pageX, y: e.pageY,
                    rx: e.pageX - data.sx, ry: e.pageY - data.sy,
                    dx: e.pageX - data.x, dy: e.pageY - data.y
                });
                data.x = e.pageX;
                data.y = e.pageY;
            },
            up: function (e, data) {
                if (!data.active) {
                    return;
                }
                framework.invoke('mouseup', {
                    x: e.pageX, y: e.pageY,
                    rx: e.pageX - data.sx, ry: e.pageY - data.sy,
                    dx: e.pageX - data.x, dy: e.pageY - data.y
                });
                data.active = false;
            }
        })
        .on('touchstart', function (e) {
            e = e.originalEvent;
            if (currentTouch != null) {
                return;
            }

            var touch = e.changedTouches.item(0);
            if (touch == null) {
                return;
            }

            currentTouch = touch.identifier;
            framework.invoke('mousedown', {
                x: touch.pageX, y: touch.pageY,
                rx: 0, ry: 0,
                dx: 0, dy: 0
            });
            lastX = startX = touch.pageX;
            lastY = startY = touch.pageY;

            e.preventDefault();
        })
        .on('touchmove', function (e) {
            e = e.originalEvent;
            var touches = e.changedTouches;
            for (var i = 0; i < touches.length; ++i) {
                var touch = touches.item(i);
                if (touch.identifier !== currentTouch) {
                    continue;
                }
                framework.invoke('mousemove', {
                    x: touch.pageX, y: touch.pageY,
                    rx: touch.pageX - startX, ry: touch.pageY - startY,
                    dx: touch.pageX - lastX, dy: touch.pageY - lastY
                });
                lastX = touch.pageX;
                lastY = touch.pageY;
            }
            e.preventDefault();
        })
        .on('touchend', function (e) {
            e = e.originalEvent;
            var touches = e.changedTouches;
            for (var i = 0; i < touches.length; ++i) {
                var touch = touches.item(i);
                if (touch.identifier !== currentTouch) {
                    continue;
                }
                framework.invoke('mouseup', {
                    x: touch.pageX, y: touch.pageY,
                    rx: touch.pageX - startX, ry: touch.pageY - startY,
                    dx: touch.pageX - lastX, dy: touch.pageY - lastY
                });
                currentTouch = null;
            }
            e.preventDefault();
        })
        .on('touchcancel', function (e) {
            e = e.originalEvent;
            var touches = e.changedTouches;
            for (var i = 0; i < touches.length; ++i) {
                var touch = touches.item(i);
                if (touch.identifier !== currentTouch) {
                    continue;
                }
                framework.invoke('mouseup', {
                    x: touch.pageX, y: touch.pageY,
                    rx: touch.pageX - startX, ry: touch.pageY - startY,
                    dx: touch.pageX - lastX, dy: touch.pageY - lastY
                });
                currentTouch = null;
            }
        });
    }

    animate();
}
