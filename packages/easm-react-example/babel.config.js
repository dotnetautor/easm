module.exports = {
	"presets": [
		["@babel/preset-react"],
		["@babel/preset-env", {
			"targets": {
				"browsers": [
					">0.25%",
					"not ie 11",
					"not op_mini all"
				]},
			"spec": true,
			"loose": false,
			"modules": false,
			"debug": false,
      "useBuiltIns": "entry",
      "corejs": 3
		}]
	],

	"plugins": []
};
