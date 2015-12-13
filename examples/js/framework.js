
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

    var getTime = 
        performance && performance.now ?
            function () { return performance.now() * 0.001; } :
        performance && performance.webkitNow ?
            function () { return performance.webkitNow() * 0.001; } :
        performance && performance.mozNow ?
            function () { return performance.mozNow() * 0.001; } :
        performance && performance.msNow ?
            function () { return performance.msNow() * 0.001; } :
        Date.now ?
            function () { return Date.now() * 0.001; } :
            function () { return +new Date() * 0.001; };

    var pressedKeys = new Map();

    var framework = {
        __signals: {
            resize: [],
            animate: [],
            preanimate: [],
            postanimate: [],
            mousedown: enableMouse,
            mousemove: enableMouse,
            mouseup: enableMouse,
            lockedmousedown: enablePointerLock,
            lockedmousemove: enablePointerLock,
            lockedmouseup: enablePointerLock,
            keydown: [],
            keyup: []
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
        __refTime: getTime(),

        getTime: function (action) {
            return getTime() - this.__refTime;
        },

        isKeyPressed: function (key) {
            return !!pressedKeys.get(key);
        },

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

        /** 
         * Creates a camera which can be rotated by mouse like
         * first person shooters.
         * @param opt.look User cannot look around if this is set to false.
         * @param opt.move null, false, fly, or walk.
         * @param opt.speed
         * @return THREE.Camera
         */
        setupFirstPersonCamera: function (opt) {
            var near = opt.near, far = opt.far, fov;
            if (near == null) near = 1;
            if (far == null) far = 100;
            if (fov == null) fov = 70;

            var look = opt.look, move = opt.move;
            if (look == null) look = 'look';
            if (move == null) move = 'fly';

            var speed = opt.speed || 3;

            var camera = this.autoCameraAspect(new THREE.PerspectiveCamera(fov, 1, near, far));

            var yaw = 0, pitch = 0;

            function moveCamera()
            {
                camera.quaternion.setFromEuler(new THREE.Euler(-pitch, -yaw, 0, 'YXZ'));
            }
            moveCamera();

            if (look === 'look') {
                this.on('lockedmousemove', function (e) {
                    yaw += e.dx * 0.004;
                    pitch += e.dy * 0.004;
                    pitch = Math.max(Math.min(pitch, Math.PI * 0.49), Math.PI * -0.49);
                    moveCamera();
                });
            }

            if (move === 'fly' || move == 'walk') {
                var ddx = 0, ddz = 0;
                this.on('preanimate', function (e) {
                    var dx = 0, dz = 0;
                    if (framework.isKeyPressed('w')) dz = 1;
                    if (framework.isKeyPressed('s')) dz = -1;
                    if (framework.isKeyPressed('a')) dx = -1;
                    if (framework.isKeyPressed('d')) dx = 1;

                    ddx += (dx - ddx) * (1 - Math.pow(0.0002, e.deltaTime));
                    ddz += (dz - ddz) * (1 - Math.pow(0.0002, e.deltaTime));

                    var p = camera.position;

                    if (move === 'fly') {
                        var d = e.deltaTime * speed * ddz;
                        p.x += Math.sin(yaw) * Math.cos(pitch) * d;
                        p.y -= Math.sin(pitch) * d;
                        p.z -= Math.cos(yaw) * Math.cos(pitch) * d;

                        d = e.deltaTime * speed * ddx;
                        p.x += Math.cos(yaw) * Math.cos(pitch) * d;
                        p.y -= Math.sin(pitch) * d;
                        p.z += Math.sin(yaw) * Math.cos(pitch) * d;
                    } else if (move === 'walk') {
                        var d = e.deltaTime * speed * ddz;
                        p.x += Math.sin(yaw) * d;
                        p.z -= Math.cos(yaw) * d;

                        d = e.deltaTime * speed * ddx;
                        p.x += Math.cos(yaw) * d;
                        p.z += Math.sin(yaw) * d;
                    }

                });
            }


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

    var lastFrameTime = getTime();

    function animate()
    {
        var t = getTime();
        var dt = t - lastFrameTime;
        lastFrameTime = t;

        requestAnimationFrame( animate );

        var e = {
            time: t,
            deltaTime: dt
        };
        framework.invoke('preanimate', e);
        framework.invoke('animate', e);
        framework.invoke('postanimate', e);

        stats.update();

    }

    var mouseEnabled = false;

    function enableMouse()
    {
        if (mouseEnabled) {
            return;
        }
        mouseEnabled = true;
        
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

    var pointerLockEnabled = false;

    function enablePointerLock()
    {
        if (pointerLockEnabled) {
            return;
        }
        pointerLockEnabled = true;

        framework.on('mousedown', function (e) {
            framework.invoke('lockedmousedown', {
            });
        });
        framework.on('mouseup', function (e) {
            framework.invoke('lockedmouseup', {
            });
        });
        framework.on('mousemove', function (e) {
            framework.invoke('lockedmousemove', {
                dx: e.dx, dy: e.dy
            });
        });

        // hijack mouse events
        $(renderer.domElement)
        .off('mousedown').off('mouseup').off('mousemove')
        .on('mouseup', function (e) {
            if (e.which !== 1) {
                return;
            }

            this.requestPointerLock = this.requestPointerLock ||
                this.mozRequestPointerLock ||
                this.webkitRequestPointerLock;
            this.requestPointerLock();
        })
        .on('mousemove', function (e) {
            if (document.pointerLockElement !== this &&
                document.mozPointerLockElement !== this &&
                document.webkitPointerLockElement !== this &&
                document.msPointerLockElement !== this) {
                return;
            }

            e = e.originalEvent;

            var dx = e.movementX, dy = e.movementY;
            if (dx == null) {
                dx = e.mozMovementX; dy = e.mozMovementY;
            }
            if (dx == null) {
                dx = e.webkitMovementX; dy = e.webkitMovementY;
            }
            if (dx == null) {
                dx = e.msMovementX; dy = e.msMovementY;
            }

            framework.invoke('lockedmousemove', {
                dx: dx, dy: dy
            });
        });
    }

    $('body')
    .on('keydown', function (e) {
        pressedKeys.set(e.key, true);
        framework.invoke('keydown', e);
    })
    .on('keyup', function (e) {
        pressedKeys.delete(e.key);
        framework.invoke('keyup', e);
    });

    animate();
}
