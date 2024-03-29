/**
 * @author Santhosh Vasabhaktula <santhosh@ilimi.in>
 */
org.ekstep.contenteditor.stageManager = new (Class.extend({
	stages: [],
	thumbnails: {},
	currentStage: undefined,
	canvas: undefined,
	contentLoading: false,
	summary: [],
	assets: [],
	plugins_used: [],
	summaryTemplate: {"manifest":{"media":[{"id":"org.ekstep.summary_template_js","plugin":"org.ekstep.summary","src":"/content-plugins/org.ekstep.summary-1.0/renderer/summary-template.js","type":"js","ver":"1.0"},{"id":"org.ekstep.summary_template_css","plugin":"org.ekstep.summary","src":"/content-plugins/org.ekstep.summary-1.0/renderer/style.css","type":"css","ver":"1.0"},{"id":"org.ekstep.summary","plugin":"org.ekstep.summary","src":"/content-plugins/org.ekstep.summary-1.0/renderer/plugin.js","type":"plugin","ver":"1.0"},{"id":"org.ekstep.summary_manifest","plugin":"org.ekstep.summary","src":"/content-plugins/org.ekstep.summary-1.0/manifest.json","type":"json","ver":"1.0"},{"assetId":"summaryImage","id":"org.ekstep.summary_summaryImage","preload":true,"src":"/content-plugins/org.ekstep.summary-1.0/assets/summary-icon.jpg","type":"image"}]},"pluginManifest":{"depends":"","id":"org.ekstep.summary","type":"plugin","ver":"1.0"},"stage":{"x":0,"y":0,"w":100,"h":100,"rotate":null,"config":{"__cdata":"{\"opacity\":100,\"strokeWidth\":1,\"stroke\":\"rgba(255, 255, 255, 0)\",\"autoplay\":false,\"visible\":true,\"color\":\"#FFFFFF\",\"genieControls\":false,\"instructions\":\"\"}"},"id":"summary_stage_id","manifest":{"media":[{"assetId":"summaryImage"}]},"org.ekstep.summary":[{"config":{"__cdata":"{\"opacity\":100,\"strokeWidth\":1,\"stroke\":\"rgba(255, 255, 255, 0)\",\"autoplay\":false,\"visible\":true}"},"id":"summary_plugin_id","rotate":0,"x":6.69,"y":-27.9,"w":77.45,"h":125.53,"z-index":0}]}},
	init: function () {
		var instance = this
		fabric.Object.prototype.transparentCorners = false
		fabric.Object.prototype.lockScalingFlip = true
		fabric.Object.prototype.hasRotatingPoint = false
		fabric.Object.prototype.cornerSize = 6
		fabric.Object.prototype.padding = 2
		fabric.Object.prototype.borderColor = '#1A98FA'
		fabric.Object.prototype.cornerColor = '#1A98FA'
		WebFontConfig.active = function () {
			if (instance.currentStage) {
				instance.clearCanvas(instance.canvas)
				org.ekstep.contenteditor.api.dispatchEvent('stage:select', { stageId: instance.currentStage.id })
			}
		}
		WebFont.load(WebFontConfig)
		// fabric.Object.prototype.rotatingPointOffset = 18; //TODO need to add rotation in bas class
		this.canvas = new fabric.Canvas('canvas', { backgroundColor: '#FFFFFF', preserveObjectStacking: true, perPixelTargetFind: false })
		console.log('Stage manager initialized')
		fabric.initAligningGuidelines(this.canvas)
		org.ekstep.pluginframework.eventManager.addEventListener('stage:delete', this.deleteConfirmationDialog, this)
		org.ekstep.pluginframework.eventManager.addEventListener('stage:duplicate', this.duplicateStage, this)
		instance.canvas.renderAll()
	},
	clearCanvas: function (canvas) {
		canvas.clear()
		canvas.setBackgroundColor('#FFFFFF', canvas.renderAll.bind(canvas))
	},
	registerEvents: function () {
		this.canvas.on('object:modified', function (options, event) {
			org.ekstep.contenteditor.stageManager.dispatchObjectEvent('modified', options, event)
		})
		this.canvas.on('object:selected', function (options, event) {
			org.ekstep.contenteditor.stageManager.dispatchObjectEvent('selected', options, event)
		})
		this.canvas.on('selection:cleared', function (options, event) {
			org.ekstep.contenteditor.stageManager.dispatchObjectEvent('unselected', options, event)
		})
		this.canvas.on('object:added', function (options, event) {
			org.ekstep.contenteditor.stageManager.dispatchObjectEvent('added', options, event)
		})
		this.canvas.on('object:removed', function (options, event) {
			org.ekstep.contenteditor.stageManager.dispatchObjectEvent('removed', options, event)
		})
		this.canvas.on('object:moving', function (options, event) {
			org.ekstep.contenteditor.stageManager.dispatchObjectEvent('moving', options, event)
		})
		this.canvas.on('object:scaling', function (options, event) {
			org.ekstep.contenteditor.stageManager.dispatchObjectEvent('scaling', options, event)
		})
		org.ekstep.pluginframework.eventManager.addEventListener('stage:select', this.selectStage, this)
	},
	dispatchObjectEvent: function (eventType, options, event) {
		var meta = org.ekstep.contenteditor.stageManager.getObjectMeta(options)
		org.ekstep.pluginframework.eventManager.dispatchEvent('object:' + eventType, meta)
		if (meta.type !== '') {
			org.ekstep.pluginframework.eventManager.dispatchEvent(meta.type + ':' + eventType, meta)
		}
	},
	selectStage: function (event, data) {
		if (_.isUndefined(this.currentStage)) {
			this.currentStage = _.find(this.stages, { id: data.stageId })
			this.currentStage.isSelected = true
			this.currentStage.setCanvas(this.canvas)
			this.currentStage.render(this.canvas)
		} else {
			this.currentStage.isSelected = false
			org.ekstep.pluginframework.eventManager.dispatchEvent('stage:unselect', { stageId: this.currentStage.id })
			this.clearCanvas(this.canvas)
			var selectStage = _.find(this.stages, { id: data.stageId })
			if (!_.isUndefined(selectStage)) {
				this.currentStage = selectStage
			}
			this.currentStage.isSelected = true
			this.canvas.off('object:added')
			this.currentStage.setCanvas(this.canvas)
			this.currentStage.render(this.canvas)
			this.canvas.on('object:added', function (options, event) {
				org.ekstep.contenteditor.stageManager.dispatchObjectEvent('added', options, event)
			})
		}
	},
	addStage: function (stage) {
		var prevStageId = _.isUndefined(this.currentStage) ? undefined : this.currentStage.id
		this.addStageAt(stage, stage.attributes.position)
		this.selectStage(null, { stageId: stage.id })
		org.ekstep.contenteditor.api.dispatchEvent('stage:add', { stageId: stage.id, prevStageId: prevStageId })
	},
	deleteStage: function (event, data) {
		var currentStage = _.find(this.stages, { id: data.stageId })
		this.deleteStageInstances(currentStage)
		var currentStageIndex = this.getStageIndex(currentStage)
		this.stages.splice(currentStageIndex, 1)
		if (this.stages.length === 0) org.ekstep.contenteditor.api.dispatchEvent('stage:create', { 'position': 'next' })
		else if (currentStageIndex === this.stages.length) this.selectStage(null, { stageId: this.stages[currentStageIndex - 1].id })
		else this.selectStage(null, { stageId: this.stages[currentStageIndex].id })
		org.ekstep.contenteditor.api.dispatchEvent('stage:removed', { stageId: data.stageId })
	},
	deleteStageInstances: function (stage) {
		// Disable any object group selection if active
		if (stage.canvas.getActiveGroup()) {
			stage.canvas.discardActiveGroup()
		}
		_.forEach(_.clone(stage.canvas.getObjects()), function (obj) {
			if (obj) {
				stage.canvas.remove(obj)
			}
		})
	},
	getStageIndex: function (stage) {
		return org.ekstep.contenteditor.api.getAllStages().findIndex(function (obj) {
			return obj.id === stage.id
		})
	},
	getStage: function (stageId) {
		return _.find(this.stages, { id: stageId })
	},
	duplicateStage: function (event, data) {
		var currentStage = _.find(this.stages, { id: data.stageId })
		var plugins = []
		var stage = this.stages[this.getStageIndex(currentStage)]
		org.ekstep.contenteditor.api.dispatchEvent('stage:create', { 'position': 'afterCurrent', stageECML: stage.toECML() })
		org.ekstep.pluginframework.eventManager.enableEvents = false
		_.forEach(stage.children, function (plugin) {
			plugins.push({ 'z-index': plugin.attributes['z-index'], data: plugin })
		})
		_.forEach(_.sortBy(plugins, 'z-index'), function (plugin) {
			org.ekstep.contenteditor.api.cloneInstance(plugin.data)
		})
		this.currentStage.destroyOnLoad(stage.children.length, this.canvas, function () {
			org.ekstep.pluginframework.eventManager.enableEvents = true
		})
		org.ekstep.contenteditor.api.dispatchEvent('stage:select', { stageId: this.currentStage.id })
	},
	getObjectMeta: function (options) {
		var pluginId = (options && options.target) ? options.target.id : ''
		return {
			'id': pluginId,
			'type': org.ekstep.pluginframework.pluginManager.getPluginType(pluginId),
			'ver': org.ekstep.pluginframework.pluginManager.getPluginVersion(pluginId)
		}
	},
	addStageAt: function (stage, position) {
		var currentIndex
		switch (position) {
		case 'beginning':
			this.stages.unshift(stage)
			break
		case 'end':
		case 'next':
			this.stages.push(stage)
			break
		case 'afterCurrent':
		case 'beforeCurrent':
			currentIndex = this.getStageIndex(org.ekstep.contenteditor.api.getCurrentStage())
			if (position === 'afterCurrent' && currentIndex >= 0) this.stages.splice(currentIndex + 1, 0, stage)
			if (position === 'beforeCurrent' && currentIndex >= 0) this.stages.splice(currentIndex, 0, stage)
			break
		default:
			this.stages.push(stage)
			break
		};
	},
	onStageDragDrop: function (srcStageId, destStageId) {
		var srcIdx = this.getStageIndexById(srcStageId)
		var destIdx = this.getStageIndexById(destStageId)
		if (srcIdx < destIdx) {
			var src = this.stages[srcIdx]
			for (var i = srcIdx; i <= destIdx; i++) {
				this.stages[i] = this.stages[i + 1]
				if (i === destIdx) this.stages[destIdx] = src
			}
		}
		if (srcIdx > destIdx) {
			var newSrc = this.stages[srcIdx]
			for (var j = srcIdx; j >= destIdx; j--) {
				this.stages[j] = this.stages[j - 1]
				if (j === destIdx) this.stages[destIdx] = newSrc
			}
		}

		org.ekstep.contenteditor.api.dispatchEvent('stage:reorder', { stageId: srcStageId, fromIndex: srcIdx, toIndex: destIdx })
	},
	getStageIndexById: function (stageId) {
		return _.findIndex(this.stages, function (stage) {
			return stage.id === stageId
		})
	},
	deleteConfirmationDialog: function (event, data) {
		var instance = this
		org.ekstep.contenteditor.api.getService('popup').open({
			template: 'deleteStageDialog.html',
			controller: ['$scope', function ($scope) {
				$scope.delete = function () {
					$scope.closeThisDialog()
					instance.deleteStage(event, data)
				}
			}],
			showClose: false
		})
	},
	showLoadScreenMessage: function () {
		var obj = _.find(org.ekstep.contenteditor.api.getAngularScope().appLoadMessage, { 'id': 3 })
		if (_.isObject(obj)) {
			obj.message = 'Loading your lesson'
			obj.status = true
		}
		org.ekstep.contenteditor.api.ngSafeApply(org.ekstep.contenteditor.api.getAngularScope())
		setTimeout(function () {
			org.ekstep.contenteditor.api.getAngularScope().closeLoadScreen() // added 2 sec set timeout to show the content load message
		}, 2000)
	},
	getStageIcons: function () {
		return this.thumbnails
	},
	updateStageIcons: function () {
		var instance = this
		var allStageIcons = org.ekstep.contenteditor.stageManager.getStageIcons()
		var allStages = _.map(org.ekstep.contenteditor.stageManager.stages, 'id')
		instance.thumbnails = _.pick(allStageIcons, allStages)
		return instance.thumbnails
	},
	getPragma: function () {
		return ecEditor._.uniq(this.pragma)
	},

	

	toECML: function () {
		var instance = this
		var content = { theme: { id: 'theme', version: '1.0', startStage: this.stages[0].id, stage: [], manifest: { media: [] }, 'plugin-manifest': { plugin: [] } } }
		this.setNavigationalParams()
		var mediaMap = {}
		var plugin_arr = []
		instance.summary = []
		instance.assets = []
		instance.pragma = null
		_.forEach(this.stages, function (stage, index) {
			instance.thumbnails[stage.id] = stage.thumbnail
			var stageBody = stage.toECML()
			stageBody.manifest = { media: [] }
			var stageAssets = []
			plugin_arr.push({ identifier: stage.manifest.id, semanticVersion: stage.manifest.ver})
			_.forEach(stage.children, function (plugin) {
				var id = plugin.getManifestId()
				plugin_arr.push({ identifier: plugin.manifest.id, semanticVersion: plugin.manifest.ver});
				if (_.isUndefined(stageBody[id])) stageBody[id] = []
				stageBody[id].push(plugin.toECML())
				var summaryObj = plugin.getSummary()
				if (summaryObj) instance.summary.push(summaryObj)
				var streamingObj = instance.isStreamingAsset(plugin)
				if (streamingObj !== -1 && !ecEditor._.isUndefined(plugin.attributes.asset)) instance.assets.push(plugin.attributes.asset)
				var pragma = plugin.getPragmaValue()
				// if any plugin return pragma value we pushing to array
				pragma && ((instance.pragma === null) ? instance.pragma = [pragma] : ecEditor._.uniq(instance.pragma.push(pragma)))
				var pluginMedia = plugin.getMedia()
				instance.addMediaToMediaMap(mediaMap, pluginMedia, plugin.manifest)
				if(plugin.manifest.id && plugin.manifest.id != 'org.ekstep.questionset'){
					stageAssets = _.concat(stageAssets, _.keys(pluginMedia))
				}
			})
			stageBody.manifest.media = _.map(_.uniq(stageAssets), function (asset) {
				return { assetId: asset }
			})
			content.theme.stage.push(stageBody)
		})
		
		instance.manifestGenerator(content)

		/* istanbul ignore else  */
		if (this._isAssessment()) {
			content = this._appendPluginStage(content, this.summaryTemplate);
		} 
		ecEditor._.each(content.theme['plugin-manifest'].plugin, function (p){
			plugin_arr.push({ identifier: p.id, semanticVersion: p.ver})
        })
        instance.plugins_used = ecEditor._.uniqBy(plugin_arr, 'identifier');
		

		if (!_.isEmpty(org.ekstep.contenteditor.mediaManager.migratedMediaMap)) {
			instance.mergeMediaMap(mediaMap)
			content.theme['migration-media'] = {}
			content.theme['migration-media'].media = _.values(org.ekstep.contenteditor.mediaManager.migratedMediaMap)
		}
		content.theme.manifest.media = _.uniqBy(_.concat(content.theme.manifest.media, _.values(mediaMap)), 'id')
		if (!_.isEmpty(org.ekstep.contenteditor.migration.patch)) {
			content.theme['patch'] = org.ekstep.contenteditor.migration.patch.toString()
        }
        // check for math use
        _.forEach(this.stages, function(stage,index){
            _.forEach(stage.children, function(plugin){
                if(!_.isUndefined(plugin._questions)){
                    content = plugin._checkForMathText(content,plugin._questions)
                }
            });
         });
		return _.cloneDeep(content)
	},
	manifestGenerator: function (content) {
		var pluginsUsed = {}
		var DEFAULT_COMPATIBILITY_VER = 2 // renderer
		_.forEach(org.ekstep.pluginframework.pluginManager.getPluginInstances(), function (plugin) {
			pluginsUsed[plugin.manifest.id] = plugin.manifest.id
		})
		ManifestGenerator.generate(_.drop(_.values(pluginsUsed)), 'org.ekstep.stage')
		content.theme.manifest.media = _.uniqBy(_.concat(content.theme.manifest.media, ManifestGenerator.getMediaManifest()), 'id')
		content.theme['plugin-manifest'].plugin = ManifestGenerator.getPluginManifest()
		content.theme.compatibilityVersion = ManifestGenerator.getCompatibilityVersion() || DEFAULT_COMPATIBILITY_VER
	},
	mergeMediaMap: function (mediaMap) {
		_.forIn(org.ekstep.contenteditor.mediaManager.migratedMediaMap, function (value, key) {
			if (_.isUndefined(mediaMap[key])) {
				mediaMap[key] = value
				value.src = org.ekstep.contenteditor.mediaManager.getMediaOriginURL(value.src)
			}
		})
	},
	addMediaToMediaMap: function (mediaMap, media, manifest, stageBody) {
		var pluginType = ['plugin', 'css', 'js']
		if (_.isObject(media)) {
			_.forIn(media, function (value, key) {
				if (!mediaMap[key]) {
					mediaMap[key] = value
					value.src = org.ekstep.contenteditor.mediaManager.getMediaOriginURL(value.src)
					if (_.indexOf(pluginType, mediaMap[key].type) !== -1) {
						mediaMap[key].plugin = manifest.id
						mediaMap[key].ver = manifest.ver
					}
				} else if (value.preload) {
					mediaMap[key].preload = value.preload
				}
			})
		}
	},
	setNavigationalParams: function () {
		var instance = this
		var size = this.stages.length
		_.forEach(this.stages, function (stage, index) {
			if (index === 0) {
				stage.deleteParam('previous') // first stage should not have previous param.
			}
			if (index !== 0) {
				stage.addParam('previous', instance.stages[index - 1].id)
			}
			if (index < (size - 1)) {
				stage.addParam('next', instance.stages[index + 1].id)
			}
			if (size === index + 1 && instance._isAssessment()) {
				stage.addParam('next', 'summary_stage_id')
			}  else if (size === index + 1) {
				stage.deleteParam('next') // last stage should not have next param.
			}
		})
	},

	fromECML: function (contentBody, stageIcons) {
		var instance = this
		var startTime = (new Date()).getTime()
		org.ekstep.contenteditor.api.getAngularScope().appLoadMessage.push({ 'id': 3, 'message': 'Loading your lesson', 'status': false })
		org.ekstep.contenteditor.api.ngSafeApply(org.ekstep.contenteditor.api.getAngularScope())
		org.ekstep.contenteditor.stageManager.contentLoading = true
		org.ekstep.pluginframework.eventManager.enableEvents = false
		
		/* istanbul ignore else  */
		if (this._isAssessment()) {
			contentBody = this._removePluginStage(contentBody, 'org.ekstep.summary')
		} 
		this._loadMedia(contentBody)
		this._loadPlugins(contentBody, function (err, res) {
			if (!err) {
				var stages = _.isArray(contentBody.theme.stage) ? contentBody.theme.stage : [contentBody.theme.stage]
				instance._loadStages(stages, stageIcons, startTime)
			}
		})
	},

	
	_loadMedia: function (contentBody) {
		_.forEach(contentBody.theme.manifest.media, function (media) {
			if (media.type === 'plugin' && org.ekstep.pluginframework.pluginManager.isPluginDefined(media.id)) {} else {
				org.ekstep.contenteditor.mediaManager.addMedia(media)
			}
		})
		// if migratedMedia present inside theme, add to migrated media
		if (contentBody.theme['migration-media']) {
			_.forEach(contentBody.theme['migration-media'].media, function (media) {
				org.ekstep.contenteditor.mediaManager.addToMigratedMedia(media)
			})
		}
	},
	_loadPlugins: function (contentBody, cb) {
		contentBody.theme.manifest.media = _.isArray(contentBody.theme.manifest.media) ? contentBody.theme.manifest.media : [contentBody.theme.manifest.media]
		var plugins = _.filter(contentBody.theme.manifest.media, { type: 'plugin' })
		var pluginList = []
		_.forEach(plugins, function (plugin) {
			pluginList.push({ id: plugin.id, ver: plugin.ver, type: 'plugin' })
		})
		org.ekstep.pluginframework.pluginManager.loadAllPlugins(pluginList, undefined, cb)
	},
	_loadStages: function (stages, stageIcons, startTime) {
		var instance = this
		stageIcons = stageIcons || '{}'
		var thumbnails = JSON.parse(stageIcons)
		instance.thumbnails = JSON.parse(stageIcons)
		var tasks = []
		_.forEach(stages, function (stage, index) {
			tasks.push(function (callback) {
				instance._loadStage(stage, index, stages.length, thumbnails[stage.id], callback)
			})
		})
		if (tasks.length === 0) {
			instance.onContentLoad(startTime)
		} else {
			// eslint-disable-next-line
			async.parallel(tasks, function (err, data) {
				instance.onContentLoad(startTime)
			})
		}
		org.ekstep.services.telemetryService.impression({
			type: 'edit',
			pageid: ecEditor.getContext('env') || 'contenteditor',
			uri: encodeURIComponent(location.href),
			duration: (new Date()).getTime() - startTime
		})
	},
	_loadStage: function (stage, index, size, thumbnail, callback) {
		delete stage.manifest
		var stageEvents = _.clone(stage.events) || {}
		var canvas
		if (thumbnail) {
			canvas = {
				toDataURL: function () {
					return thumbnail
				},
				add: function () {},
				setActiveObject: function () {},
				clear: function () {},
				renderAll: function () {},
				setBackgroundColor: function () {}
			}
		} else {
			// Some extremely complex logic is happening here. Read at your own risk
			// Instantiate a canvas to create thumbnail.
			if (index === 0) {
				canvas = this.canvas
			} else {
				$('<canvas>').attr({ id: stage.id }).css({ width: '720px', height: '405px' }).appendTo('#thumbnailCanvasContainer')
				canvas = new fabric.Canvas(stage.id, { backgroundColor: '#FFFFFF', preserveObjectStacking: true, width: 720, height: 405 })
			}
		}

		var stageInstance = org.ekstep.contenteditor.api.instantiatePlugin(org.ekstep.contenteditor.config.corePluginMapping['stage'], stage)
		stageInstance.setCanvas(canvas)
		var pluginCount = 0
		var props = _.pickBy(stage, _.isObject)
		var plugins = []
		_.forIn(props, function (values, key) {
			values = _.isArray(values) ? values : [values]
			_.forEach(values, function (value) {
				plugins.push({ id: key, 'z-index': value['z-index'], data: value })
			})
			delete stage[key]
		})

		_.forIn(_.sortBy(plugins, 'z-index'), function (plugin) {
			var pluginId = org.ekstep.contenteditor.config.corePluginMapping[plugin.id] || plugin.id
			var pluginInstance
			try {
				pluginInstance = org.ekstep.contenteditor.api.instantiatePlugin(pluginId, plugin.data, stageInstance)
				if (_.isUndefined(pluginInstance)) {
					console.log('Unable to instantiate', plugin.id)
					org.ekstep.contenteditor.api.instantiatePlugin('org.ekstep.unsupported', { data: plugin }, stageInstance)
				}
				pluginCount++
			} catch (e) {
				console.warn('error when instantiating plugin:', pluginId, plugin.data, stageInstance.id, e)
				org.ekstep.services.telemetryService.error({ 'env': 'content', 'stage': stageInstance.id, 'action': 'console log error', 'err': 'plugin instantiation', 'type': 'PORTAL', 'data': '', 'severity': 'warn' })
			}
		})
		if (stageEvents) {
			_.forEach(stageEvents, function (event) {
				_.forEach(event, function (e) {
					stageInstance.addEvent(e)
				})
			})
		}
		stageInstance.destroyOnLoad(pluginCount, canvas, callback)
	},
	onContentLoad: function (startTime) {
		org.ekstep.contenteditor.api.jQuery('#thumbnailCanvasContainer').empty()
		org.ekstep.contenteditor.api.getAngularScope().toggleGenieControl()
		org.ekstep.pluginframework.eventManager.enableEvents = true
		org.ekstep.contenteditor.stageManager.registerEvents()
		this.showLoadScreenMessage()
		org.ekstep.contenteditor.stageManager.contentLoading = false
		org.ekstep.services.telemetryService.log({
			type: 'process',
			level: 'TRACE',
			message: 'duration for content load',
			params: [{
				duration: (new Date()).getTime() - startTime
			}]
		})
		if (org.ekstep.contenteditor.api._.isEmpty(this.stages)) {
			org.ekstep.pluginframework.eventManager.dispatchEvent('stage:create', { 'position': 'beginning' })
		}
		org.ekstep.contenteditor.api.dispatchEvent('content:load:complete')
	},
	_resolveManifestMediaPath: function (id, ver, resource) {
		var src = org.ekstep.pluginframework.pluginManager.resolvePluginResource(id, ver, resource)
		if (src === false) {
			return ''
		} else if (src.indexOf('http') === -1) {
			src = org.ekstep.contenteditor.config.baseURL + src
		}
		return src
	},
	cleanUp: function () {
		this.stages = []
		this.thumbnails = {}
		this.canvas = undefined
		this.currentStage = undefined
	},
	isStreamingAsset: function (plugin) {
		var streamingPlugins = ['org.ekstep.video', 'org.ekstep.audio', 'org.ekstep.image']
		return _.indexOf(streamingPlugins, plugin.manifest.id)
	},
	getSummary: function () {
		var instance = this
		var summaryData = {'totalQuestions': 0, 'totalScore': 0, 'questions': []}
		_.forEach(instance.summary, function (obj) {
			summaryData.totalQuestions = summaryData.totalQuestions + obj.totalQuestions
			summaryData.totalScore = summaryData.totalScore + obj.totalScore
			if (obj.questions && obj.questions.length > 0) {
				summaryData.questions = ecEditor._.uniqBy(ecEditor._.concat(summaryData.questions, obj.questions), 'identifier')
			}
		})
		return summaryData
	},

	_isAssessment : function() {
		return _.includes(_.mapValues(this._assessContentType(), _.method('toLowerCase')), _.toLower(this._getContentType()))
	},

	_assessContentType : function() {
		return _.has(org.ekstep.contenteditor.config, 'assessContentType') ? org.ekstep.contenteditor.config.assessContentType : ['SelfAssess']; 
	},

	_getContentType: function () {
		return ecEditor.getService('content').getContentMeta(org.ekstep.contenteditor.api.getContext('contentId')).contentType
	},

	// Append a plugin in stage
	_appendPluginStage: function (content, pluginTemplate) {
		content.theme.stage.push(pluginTemplate.stage)
		content.theme['plugin-manifest'].plugin.push(pluginTemplate.pluginManifest)
		_.forEach(pluginTemplate.manifest.media, function(media) {
			content.theme.manifest.media.push(media)
		});
		return content
	},

	// Remove a plugin from stage
	_removePluginStage: function (content, pluginName) {
		/* istanbul ignore else  */
		if (_.find(content.theme['plugin-manifest'].plugin, { id: pluginName})) 
		{
			content.theme.stage = _.filter(content.theme.stage, function(obj) {
				return !_.has(obj, pluginName);
			});
			content.theme.manifest.media = _.filter(content.theme.manifest.media, function(obj) {
				return obj.plugin !== pluginName
			})
			content.theme['plugin-manifest'].plugin = _.filter(content.theme['plugin-manifest'].plugin, function(obj) {
				return obj.id !== pluginName
			})
		}
		return content
	}
}))()
