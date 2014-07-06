var clamp = function (x, min, max) {
    return x < min ? min : (x > max ? max : x);
};

var Q = Quintus()
    .include("Sprites, Anim, Input, Touch, Scenes, UI,2D,Audio")
    .setup({ width: 600, height: 800 })
    .touch()
    .enableSound();

Q.input.touchControls({
    controls:
    [
        ['left', '<'],
        ['right', '>'],
        [],
        [],
        [],
        [],
        ['fire', 'a']
    ]
});

Q.controls();

Q.Sprite.extend("Explosion", {
    init: function (p) {
        this._super(p, {
            sprite: "explosion",
            sheet: "explosion",
            type: Q.SPRITE_NONE
        });
        this.add("animation");
        this.play("default");
        Q.audio.play("boom.wav");
    }
});


Q.Sprite.extend("Heart", {
    init: function (p) {
        this._super(p, {
            asset:"heart.png",
            type: Q.SPRITE_NONE
        });

        if (Q("Heart").length != 0) {
            var lastHearth = Q("Heart").items[Q("Heart").length - 1];
            this.p.x = lastHearth.p.x + this.p.w;
            this.p.y = lastHearth.p.y;
        } else {
            this.p.x = this.p.w / 2;
            this.p.y = this.p.h / 2;    
        }
    },
    step: function (dt) {
        this.p.y = this.stage.viewport.y + this.p.w;
    }
});

Q.Sprite.extend("PlayerHB", {
    init: function (p) {
        
        // Create a random shape (defined below)
        p = this.createShape(p);

        // Initialize the p hash
        this._super(p, { type: Q.SPRITE_FRIENDLY, x: 0, y: 0 });

        this.on("hit", function (col) {
            if (col.obj.isA("Shot") && ((col.obj.p.type & Q.SPRITE_ENEMY) == Q.SPRITE_ENEMY)) {
                var player = Q("Player").first();
                player.p.life--;
                col.obj.destroy();
                var lastHearth = Q("Heart").items[Q("Heart").length - 1];
                lastHearth.destroy();
                Q("Heart").items.splice(Q("Heart").length - 1, 1);
                if (player.p.life == 0) {
                    this.destroy();
                    this.stage.insert(new Q.Explosion({ x: player.p.x, y: player.p.y }));
                    player.destroy();
                    Q.stageScene("endGame", 1, { label: "You Died!" });
                }
            }
        });

    },
    createShape: function (p) {
        p = p || {};
        p.points = [];
        var player = Q("Player").first();
        p.points.push([-(player.p.w / 2), player.p.h/2]);
        p.points.push([0,-player.p.h/2]);
        p.points.push([player.p.w / 2, player.p.h/2]);
        return p;
    },
    step: function (dt) {
        this.p.x = Q("Player").first().p.x;
        this.p.y = Q("Player").first().p.y;
        this.stage.collide(this);

    }
});

Q.Sprite.extend("Player", {
    init: function (p) {
        this._super(p, {
            sprite: "player",
            sheet: "player",
            x: Q.el.width / 2,
            y: Q.el.height - 60,
            type: Q.SPRITE_NONE,
            speed: 10,
            life: 5
        });
        this.add("animation");
        this.play("default");
        this.add("Gun");
    },
    step: function (dt) {
        if (Q.inputs['left'])
            this.p.x -= this.p.speed;
        if (Q.inputs['right'])
            this.p.x += this.p.speed;
        if (Q.inputs['up'])
            this.p.y -= this.p.speed;
        if (Q.inputs['down'])
            this.p.y += this.p.speed;

        /*this.p.x = clamp(this.p.x, 0 + (this.p.w / 2), Q.el.width - (this.p.w / 2));
        this.p.y = clamp(this.p.y, 0 + (this.p.h / 2), Q.el.height - (this.p.h / 2));*/
    }
});



Q.Sprite.extend("Alien", {    
   init: function(p) {
       this._super(p, {           
           sprite: "enemy",
           sheet: "enemy",
           x: Q.el.width / 2,
           speed: 200
       });

       this.p.y = this.p.h;
       this.add("animation");
       this.play("default");
       this.add("BasicAI");
       this.on("hit", function(col)
       {
           if (col.obj.isA("Shot") && ((col.obj.p.type & Q.SPRITE_FRIENDLY) == Q.SPRITE_FRIENDLY)) {
               this.stage.insert(new Q.Explosion({ x: this.p.x, y: this.p.y }));
               this.destroy();
               col.obj.destroy();
               Q.stageScene("endGame", 1, { label: "You Won!" });
           }
       });
   },
   step: function(dt) {
       this.stage.collide(this);
   }
});

Q.Sprite.extend("Shot", {
    init: function (p) {
        this._super(p, {
            sprite: "shot",
            sheet: "shot",
            speed: 200
        });

        this.add("animation");
        this.play("default");
    },
    step: function (dt) {
        this.p.y -= this.p.speed * dt;
        
        if (this.p.y > Q.el.height || this.p.y < 0) {
            this.destroy();
        }
    }
});

Q.component("BasicAI", {    
    added: function() {
        this.entity.changeDirections();
        this.entity.on("step", "move");
        this.entity.on("step", "tryToFire");
        this.entity.add("Gun");
    },
    extend: {
        changeDirections: function() {
            var entity = this;
            var numberOfSeconds = Math.floor((Math.random() * 5) + 1);
            setTimeout(function() {
                entity.p.speed = -entity.p.speed;
                entity.changeDirections();
            }, numberOfSeconds * 1000);
        },
        move: function(dt) {
            var entity = this;
            entity.p.x -= entity.p.speed * dt;
            if (entity.p.x > Q.el.width - (entity.p.w / 2) || entity.p.x < 0 + (entity.p.w / 2)) {
                entity.p.speed = -entity.p.speed;
            }
        },
        
        tryToFire: function() {
            var entity = this;
            var player = Q("Player").first();
            if (!player)
                return;
            if (player.p.x + player.p.w > entity.p.x && player.p.x - player.p.w < entity.p.x) {
                this.fire(Q.SPRITE_ENEMY);
            }
        }
    }
});

Q.component("Gun", {
    added: function () {
        this.entity.p.shots = [];
        this.entity.p.canFire = true;
        this.entity.on("step", "handleFiring");
    },

    extend: {
        handleFiring: function (dt) {
            var entity = this;
            
            for (var i = entity.p.shots.length - 1; i >= 0; i--) {
                if (entity.p.shots[i].isDestroyed) {
                    entity.p.shots.splice(i, 1);                 
                }
            }

            if (Q.inputs['fire'] && entity.p.type == Q.SPRITE_NONE) {
                entity.fire(Q.SPRITE_FRIENDLY);
            }
        },

        fire: function (type) {
            var entity = this;

            if (!entity.p.canFire)
                return;

            var shot;
            if (type == Q.SPRITE_FRIENDLY) {
                shot = Q.stage().insert(new Q.Shot({ x: entity.p.x, y: entity.p.y - 50, speed: 200, type: Q.SPRITE_DEFAULT | Q.SPRITE_FRIENDLY }));
                setTimeout(function () {
                    entity.p.canFire = true;
                }, 200);
            } else {
                shot = Q.stage().insert(new Q.Shot({ x: entity.p.x, y: entity.p.y + entity.p.h - 20, speed: -200, type: Q.SPR | Q.SPRITE_ENEMY }));
                setTimeout(function () {
                    entity.p.canFire = true;
                }, 500);
            }
            entity.p.shots.push(shot);
            entity.p.canFire = false;
            

        }
    }
});

Q.scene("mainLevel", function (stage) {
    Q.gravity = 0;
    //stage.insert(new Q.Sprite({ asset: "cave_bg2.png", x: Q.el.width / 2, y: 0, type: Q.SPRITE_NONE }));
    stage.insert(new Q.Repeater({ asset: "cave_bg.png", speedX: 1, speedY: 1 }));
    var player = stage.insert(new Q.Player());
    stage.insert(new Q.Alien());
    stage.insert(new Q.PlayerHB());
    stage.add("viewport").follow(player, { x: false, y: true });
    stage.viewport.offset(0, 300);
    for (i = 0; i < player.p.life; i++) {
        stage.insert(new Q.Heart());
    }
    
    
});

Q.scene("endGame", function(stage) {
    var container = stage.insert(new Q.UI.Container({        
        x: Q.width / 2, y: Q.height /2, fill: "#FFFFFF"
    }));

    var button = container.insert(new Q.UI.Button({        
        x: 0, y: 0, fill: "#CCCCCC", label: "Play Again"
    }));

    container.insert(new Q.UI.Text({        
       x: 10, y: -10 - button.p.h, label: stage.options.label
    }));
    button.on("click", function() {
        Q.clearStages();
        Q.stageScene("mainLevel");
    });
    container.fit(20);
});

Q.load(["cave_bg.png", "spaceship2.png", "shot.png", "alien2.png","heart.png","enemy.png", "explosion.png",
    "player.json", "shot.json", "alien.json", "enemy.json","explosion.json","boom.wav"], function () {
        //Q.debug = true;
        //Q.debugFill = true;
        Q.compileSheets("spaceship2.png", "player.json");
        Q.compileSheets("enemy.png", "enemy.json");
        Q.compileSheets("shot.png", "shot.json");
        Q.compileSheets("alien2.png", "alien.json");
        Q.compileSheets("explosion.png", "explosion.json");
        Q.animations("player", { default: { frames: [0, 1, 2, 3], rate: 1 / 4 } });
        Q.animations("shot", { default: { frames: [0, 1, 2, 3], rate: 1 / 4 } });
        Q.animations("alien", { default: { frames: [0, 1, 2, 3], rate: 1 / 4 } });
        Q.animations("enemy", { default: { frames: [0, 1, 2, 3, 4, 5], rate: 1 / 8 } });
        Q.animations("explosion", { default: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], rate: 1 / 6,loop: false } });
        Q.stageScene("mainLevel");
    });