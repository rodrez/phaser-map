import { Scene } from "phaser";

export class Preloader extends Scene {
	constructor() {
		super("Preloader");
	}

	init() {
		// Center coordinates based on the game size
		const centerX = this.cameras.main.width / 2;
		const centerY = this.cameras.main.height / 2;

		// We loaded this image in our Boot Scene, so we can display it here
		// this.add.image(centerX, centerY, 'background');

		// A simple progress bar. This is the outline of the bar.
		this.add.rectangle(centerX, centerY, 468, 32).setStrokeStyle(1, 0xffffff);

		// This is the progress bar itself. It will increase in size from the left based on the % of progress.
		const bar = this.add.rectangle(centerX - 230, centerY, 4, 28, 0xffffff);

		// Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
		this.load.on("progress", (progress) => {
			// Update the progress bar (our bar is 464px wide, so 100% = 464px)
			bar.width = 4 + 460 * progress;
		});
	}

	preload() {
		// Load the assets for the game
		this.load.setPath("public/assets");

		// Load any additional assets here
		this.load.image("logo", "logo.png");
		this.load.spritesheet("player", "/characters/player.png", {
			frameWidth: 32,
			frameHeight: 32
		});

		// Load environment assets
		this.load.image("particle", "/particles/particle.png");
		this.load.image("tree", "/environment/tree.png");
		// Load spruce-tree as a spritesheet (51x87 with multiple frames)
		this.load.spritesheet("spruce-tree", "/environment/spruce-tree.png", {
			frameWidth: 51,
			frameHeight: 87,
		});
		this.load.spritesheet("fruits", "/items/fruits.png", {
			frameWidth: 16,
			frameHeight: 16,
		});

		// Load monster sprites
		this.load.image('stag', '/monsters/stag.png');
		this.load.image('wolf', '/monsters/wolf.png');
		this.load.image('deer', '/monsters/deer.png');
		this.load.image('boar', '/monsters/boar-64.png');
		this.load.image('dragon', '/monsters/black-dragon-128.png');
		this.load.image('ogre', '/monsters/ogre-64.png');
		this.load.image('lizardfolk', '/monsters/lizardfolk-64.png');
		this.load.image('grizzly', '/monsters/grizzly-128.png');

		// Dungeon Bosses
		this.load.image('lizardfolk-king', '/dungeons/lost-swamp/lizardfolk-king-128.png');
		
		// Portal
		this.load.image('portal', '/dungeons/portal-256.png');
		
		// Load individual item images
		this.load.image('item-apple', '/items/apple.png');
		this.load.image('item-leather', '/items/leather.png');
		this.load.image('item-wood', '/items/wood.png');
		this.load.image('default-item', '/items/default.png');

		// Weapons
		this.load.image('sword', '/weapons/sword-48.png');
		this.load.image('crossbow', '/weapons/crossbow-48.png');
		this.load.image('axe', '/weapons/axe-48.png');
		this.load.image('staff', '/weapons/staff-48.png');

		// Armor

		// Ailments
		this.load.image('ailment-poison', '/ailments/poisoned-32.png');
		this.load.image('ailment-fire', '/ailments/burn-32.png');
		this.load.image('ailment-frozen', '/ailments/frozen-32.png');
		this.load.image('ailment-stunned', '/ailments/stun-32.png');
		this.load.image('ailment-pinned', '/ailments/pinned-32.png');
		
		
	}

	create() {
		// When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
		// For example, you can define global animations here, so we can use them in other scenes.

		// Move to the MainMenu
		this.scene.start("Game");
	}
}
