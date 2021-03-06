/****************************************************************************
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2014 Chukong Technologies Inc.
 Copyright (c) 2012 Pierre-David Bélanger

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

/**
 * the value of stencil bits.
 * @type Number
 */
cc.stencilBits = -1;

/**
 * <p>
 *     cc.ClippingNode is a subclass of cc.Node.      cc.ClippingNode是cc.Node的一个子类                                                       <br/>
 *     It draws its content (children) clipped using a stencil.    用于通过模板绘制可裁剪的内容                                           <br/>
 *     The stencil is an other cc.Node that will not be drawn.   模板是cc.Node类，且不会被绘制                                            <br/>
 *     The clipping is done using the alpha part of the stencil (adjusted with an alphaThreshold). 绘制通过使用模板的开始部分, 使用一个alphaThreshold调整
 * </p>
 * @class
 * @extends cc.Node
 * @param {cc.Node} [stencil=null]
 *
 * @property {Number}   alphaThreshold  - Threshold for alpha value. Threshold赋初值
 * @property {Boolean}  inverted        - Indicate whether in inverted mode. 无论是否倒置模式都要声明
 */
//@property {cc.Node}  stencil         - he cc.Node to use as a stencil to do the clipping.裁剪用的cc.Node模板
cc.ClippingNode = cc.Node.extend(/** @lends cc.ClippingNode#  cc.ClippingNode入口*/{
    alphaThreshold: 0,
    inverted: false,

    _rendererSaveCmd: null,
    _rendererClipCmd: null,
    _rendererRestoreCmd: null,

    _beforeVisitCmd: null,
    _afterDrawStencilCmd: null,
    _afterVisitCmd: null,

    _stencil: null,
    _godhelpme: false,
    _clipElemType: null,

    _currentStencilFunc: null,
    _currentStencilRef: null,
    _currentStencilValueMask: null,
    _currentStencilFail: null,
    _currentStencilPassDepthFail: null,
    _currentStencilPassDepthPass:null,
    _currentStencilWriteMask:null,
    _currentStencilEnabled:null,
    _currentDepthWriteMask: null,
    _mask_layer_le: null,


    /**
     * Constructor function, override it to extend the construction behavior, remember to call "this._super()" in the extended "ctor" function.
     *构造函数，重写继承构造函数，在继承的"ctor"函数中是使用"this._super()"
     * @param {cc.Node} [stencil=null]
     */
    ctor: function (stencil) {
        cc.Node.prototype.ctor.call(this);
        this._stencil = null;
        this.alphaThreshold = 0;
        this.inverted = false;
        stencil = stencil || null;
        cc.ClippingNode.prototype.init.call(this, stencil);
    },

    _initRendererCmd: function(){
        if(cc._renderType === cc._RENDER_TYPE_CANVAS){
            this._rendererSaveCmd = new cc.ClippingNodeSaveRenderCmdCanvas(this);
            this._rendererClipCmd = new cc.ClippingNodeClipRenderCmdCanvas(this);
            this._rendererRestoreCmd = new cc.ClippingNodeRestoreRenderCmdCanvas(this);
        }else{
            this._beforeVisitCmd = new cc.CustomRenderCmdWebGL(this, this._onBeforeVisit);
            this._afterDrawStencilCmd  = new cc.CustomRenderCmdWebGL(this, this._onAfterDrawStencil);
            this._afterVisitCmd = new cc.CustomRenderCmdWebGL(this, this._onAfterVisit);
        }
    },

    /**
     * Initialization of the node, please do not call this function by yourself, you should pass the parameters to constructor to initialize it .
     *node初始化，不要自己调用这个函数，通过构造函数初始化
     * @function
     * @param {cc.Node} [stencil=null]
     */
    init: null,

    _className: "ClippingNode",

    _initForWebGL: function (stencil) {
        this._stencil = stencil;

        this.alphaThreshold = 1;
        this.inverted = false;
        // get (only once) the number of bits of the stencil buffer  获得模板缓冲区的bits数值（只有一次）
        cc.ClippingNode._init_once = true;
        if (cc.ClippingNode._init_once) {
            cc.stencilBits = cc._renderContext.getParameter(cc._renderContext.STENCIL_BITS);
            if (cc.stencilBits <= 0)
                cc.log("Stencil buffer is not enabled.");
            cc.ClippingNode._init_once = false;
        }
        return true;
    },

    _initForCanvas: function (stencil) {
        this._stencil = stencil;
        this.alphaThreshold = 1;
        this.inverted = false;
        return true;
    },

    /**
     * <p>
     *     Event callback that is invoked every time when node enters the 'stage'.  当节点加入'stage'都会调用回调函数                                 <br/>
     *     If the CCNode enters the 'stage' with a transition, this event is called when the transition starts. 如果CCNode转换后加入'stage',这个事件会在转换开始是被调用        <br/>
     *     During onEnter you can't access a "sister/brother" node. 当onEnter时不允许使用兄弟节点                                                 <br/>
     *     If you override onEnter, you must call its parent's onEnter function with this._super(). 如果你重写onEnter，必须用this.super()调用它的父onEnter函数
     * </p>
     * @function
     */
    onEnter: function () {
        cc.Node.prototype.onEnter.call(this);
        this._stencil.onEnter();
    },

    /**
     * <p>
     *     Event callback that is invoked when the node enters in the 'stage'. 当节点加入'stage'都会调用回调函数                                                       <br/>
     *     If the node enters the 'stage' with a transition, this event is called when the transition finishes.   如果节点转换后加入'stage',这个事件会在转换结束时被调用                     <br/>
     *     If you override onEnterTransitionDidFinish, you shall call its parent's onEnterTransitionDidFinish with this._super() 如果你重写onEnterTransitionDidFinish，应该用this.super()调用它的父onEnterTransitionDidFinish函数
     * </p>
     * @function
     */
    onEnterTransitionDidFinish: function () {
        cc.Node.prototype.onEnterTransitionDidFinish.call(this);
        this._stencil.onEnterTransitionDidFinish();
    },

    /**
     * <p>
     *     callback that is called every time the node leaves the 'stage'.  当节点离开'stage'都会调用回调函数  <br/>                                                     
     *     If the node leaves the 'stage' with a transition, this callback is called when the transition starts. 如果节点转换后离开'stage',这个事件会在转换开始时被调用 <br/>
     *     If you override onExitTransitionDidStart, you shall call its parent's onExitTransitionDidStart with this._super()如果你重写onExitTransitionDidStart，应该用this.super()调用它的父onExitTransitionDidStart函数
     * </p>
     * @function
     */
    onExitTransitionDidStart: function () {
        this._stencil.onExitTransitionDidStart();
        cc.Node.prototype.onExitTransitionDidStart.call(this);
    },

    /**
     * <p>
     * callback that is called every time the node leaves the 'stage'. 当节点离开'stage'都会调用回调函数<br/>
     * If the node leaves the 'stage' with a transition, this callback is called when the transition finishes.如果节点转换后离开'stage',这个事件会在转换结束时被调用 <br/>
     * During onExit you can't access a sibling node.当onExit时不允许使用兄弟节点                                                              <br/>
     * If you override onExit, you shall call its parent's onExit with this._super().如果你重写onExit，应该用this.super()调用它的父onExit函数
     * </p>
     * @function
     */
    onExit: function () {
        this._stencil.onExit();
        cc.Node.prototype.onExit.call(this);
    },

    /**
     * Recursive method that visit its children and draw them   递归访问子方法以及进行绘制
     * @function
     * @param {CanvasRenderingContext2D|WebGLRenderingContext} ctx
     */
    visit: null,

    _visitForWebGL: function (ctx) {
        var gl = ctx || cc._renderContext;

        // if stencil buffer disabled 如果模板缓存不可用
        if (cc.stencilBits < 1) {
            // draw everything, as if there where no stencil 在没有模板情况下，进行绘制
            cc.Node.prototype.visit.call(this, ctx);
            return;
        }

        if (!this._stencil || !this._stencil.visible) {
            if (this.inverted)
                cc.Node.prototype.visit.call(this, ctx);   // draw everything 绘制
            return;
        }

        if (cc.ClippingNode._layer + 1 == cc.stencilBits) {
            cc.ClippingNode._visit_once = true;
            if (cc.ClippingNode._visit_once) {
                cc.log("Nesting more than " + cc.stencilBits + "stencils is not supported. Everything will be drawn without stencil for this node and its children.");
                cc.ClippingNode._visit_once = false;
            }
            // draw everything, as if there where no stencil 在没有模板情况下，进行绘制
            cc.Node.prototype.visit.call(this, ctx);
            return;
        }

        cc.renderer.pushRenderCommand(this._beforeVisitCmd);

        //optimize performance for javascript 优化js功能
        var currentStack = cc.current_stack;
        currentStack.stack.push(currentStack.top);
        cc.kmMat4Assign(this._stackMatrix, currentStack.top);
        currentStack.top = this._stackMatrix;

        this.transform();
        //this._stencil._stackMatrix = this._stackMatrix;
        this._stencil.visit();

        cc.renderer.pushRenderCommand(this._afterDrawStencilCmd);

        // draw (according to the stencil test func) this node and its children 绘制节点和它的子节点(根据模板的测试函数)
        var locChildren = this._children;
        if (locChildren && locChildren.length > 0) {
            var childLen = locChildren.length;
            this.sortAllChildren();
            // draw children zOrder < 0 zOrder<0 绘制子节点
            for (var i = 0; i < childLen; i++) {
                if (locChildren[i] && locChildren[i]._localZOrder < 0)
                    locChildren[i].visit();
                else
                    break;
            }
            if(this._rendererCmd)
                cc.renderer.pushRenderCommand(this._rendererCmd);
            // draw children zOrder >= 0 zOrder>=0 绘制子节点
            for (; i < childLen; i++) {
                if (locChildren[i]) {
                    locChildren[i].visit();
                }
            }
        } else{
            if(this._rendererCmd)
                cc.renderer.pushRenderCommand(this._rendererCmd);
        }

        cc.renderer.pushRenderCommand(this._afterVisitCmd);

        //optimize performance for javascript 优化js功能
        currentStack.top = currentStack.stack.pop();
    },

    _onBeforeVisit: function(ctx){
        var gl = ctx || cc._renderContext;
        ///////////////////////////////////
        // INIT

        // increment the current layer 增加当前图层
        cc.ClippingNode._layer++;

        // mask of the current layer (ie: for layer 3: 00000100) 当前图层遮罩
        var mask_layer = 0x1 << cc.ClippingNode._layer;
        // mask of all layers less than the current (ie: for layer 3: 00000011) 所有小于当前图层的遮罩
        var mask_layer_l = mask_layer - 1;
        // mask of all layers less than or equal to the current (ie: for layer 3: 00000111) 所有不大于当前图层的遮罩
        //var mask_layer_le = mask_layer | mask_layer_l;
        this._mask_layer_le = mask_layer | mask_layer_l;
        // manually save the stencil state 手动保存模板状态
        this._currentStencilEnabled = gl.isEnabled(gl.STENCIL_TEST);
        this._currentStencilWriteMask = gl.getParameter(gl.STENCIL_WRITEMASK);
        this._currentStencilFunc = gl.getParameter(gl.STENCIL_FUNC);
        this._currentStencilRef = gl.getParameter(gl.STENCIL_REF);
        this._currentStencilValueMask = gl.getParameter(gl.STENCIL_VALUE_MASK);
        this._currentStencilFail = gl.getParameter(gl.STENCIL_FAIL);
        this._currentStencilPassDepthFail = gl.getParameter(gl.STENCIL_PASS_DEPTH_FAIL);
        this._currentStencilPassDepthPass = gl.getParameter(gl.STENCIL_PASS_DEPTH_PASS);

        // enable stencil use 启用模板
        gl.enable(gl.STENCIL_TEST);
        // check for OpenGL error while enabling stencil test 启用模板测试时检查OpenGL错误
        //cc.checkGLErrorDebug();

        // all bits on the stencil buffer are readonly, except the current layer bit, 除了当前图层的缓存，所有模板缓存仅可读，缓存以bit存储
        // this means that operation like glClear or glStencilOp will be masked with this value 这意味着像是glClear或glStencliOp这类操作将会以这种属性被隐藏
        gl.stencilMask(mask_layer);

        // manually save the depth test state 手动保存深度测试状态
        //GLboolean currentDepthTestEnabled = GL_TRUE;
        //currentDepthTestEnabled = glIsEnabled(GL_DEPTH_TEST);
        //var currentDepthWriteMask = gl.getParameter(gl.DEPTH_WRITEMASK);
        this._currentDepthWriteMask = gl.getParameter(gl.DEPTH_WRITEMASK);
        // disable depth test while drawing the stencil 绘制模板时禁用深度测试
        //glDisable(GL_DEPTH_TEST);
        // disable update to the depth buffer while drawing the stencil, 绘制模板时禁止深度缓存更新
        // as the stencil is not meant to be rendered in the real scene, 模板不会绘制真实图像
        // it should never prevent something else to be drawn, 它不阻止其他的绘制
        // only disabling depth buffer update should do 仅当深度缓存不可更新时可如此操作
        gl.depthMask(false);

        ///////////////////////////////////
        // CLEAR STENCIL BUFFER

        // manually clear the stencil buffer by drawing a fullscreen rectangle on it 通过在它上面绘制一个全屏大小的矩形手动清除模板缓存
        // setup the stencil test func like this: 以下是创建模板测试函数的方法
        // for each pixel in the fullscreen rectangle 对于全屏矩形中的每一个像素
        //     never draw it into the frame buffer 禁止把它绘制到画面缓存中
        //     if not in inverted mode: set the current layer value to 0 in the stencil buffer 如果不是倒置模式：在模板缓存中将当前图层状态置0
        //     if in inverted mode: set the current layer value to 1 in the stencil buffer 如果是倒置模式：在模板缓存中将当前图层状态置1
        gl.stencilFunc(gl.NEVER, mask_layer, mask_layer);
        gl.stencilOp(!this.inverted ? gl.ZERO : gl.REPLACE, gl.KEEP, gl.KEEP);

        this._drawFullScreenQuadClearStencil();

        // DRAW CLIPPING STENCIL 绘制裁剪模板
        // setup the stencil test func like this: 以下是创建模板测试函数的方法
        // for each pixel in the stencil node 对于模板节点中的每个像素
        //     never draw it into the frame buffer 禁止把它绘制到画面缓存中
        //     if not in inverted mode: set the current layer value to 1 in the stencil buffer 如果不是倒置模式：在模板缓存中将当前图层状态置1
        //     if in inverted mode: set the current layer value to 0 in the stencil buffer 如果是倒置模式：在模板缓存中将当前图层状态置0
        gl.stencilFunc(gl.NEVER, mask_layer, mask_layer);
        gl.stencilOp(!this.inverted ? gl.REPLACE : gl.ZERO, gl.KEEP, gl.KEEP);

        if (this.alphaThreshold < 1) {            //TODO desktop
            // since glAlphaTest do not exists in OES, use a shader that writes 一旦glAlphaTest在OES中不存在，使用shader写入
            // pixel only if greater than an alpha threshold 比一个alpha threshold更大的像素
            var program = cc.shaderCache.programForKey(cc.SHADER_POSITION_TEXTURECOLORALPHATEST);
            var alphaValueLocation = gl.getUniformLocation(program.getProgram(), cc.UNIFORM_ALPHA_TEST_VALUE_S);
            // set our alphaThreshold 设置alphaThreshold
            cc.glUseProgram(program.getProgram());
            program.setUniformLocationWith1f(alphaValueLocation, this.alphaThreshold);
            // we need to recursively apply this shader to all the nodes in the stencil node 在模板节点中应递归调用这个shader
            // XXX: we should have a way to apply shader to all nodes without having to do this xxx:我们应该有一种方法适用于所有节点而不是在模板节点中递归调用
            cc.setProgram(this._stencil, program);
        }
    },

    _drawFullScreenQuadClearStencil: function () {
        // draw a fullscreen solid rectangle to clear the stencil buffer 绘制一个立体的矩形以清除模板缓存
        cc.kmGLMatrixMode(cc.KM_GL_PROJECTION);
        cc.kmGLPushMatrix();
        cc.kmGLLoadIdentity();
        cc.kmGLMatrixMode(cc.KM_GL_MODELVIEW);
        cc.kmGLPushMatrix();
        cc.kmGLLoadIdentity();
        cc._drawingUtil.drawSolidRect(cc.p(-1, -1), cc.p(1, 1), cc.color(255, 255, 255, 255));
        cc.kmGLMatrixMode(cc.KM_GL_PROJECTION);
        cc.kmGLPopMatrix();
        cc.kmGLMatrixMode(cc.KM_GL_MODELVIEW);
        cc.kmGLPopMatrix();
    },

    _onAfterDrawStencil: function(ctx){
        var gl = ctx || cc._renderContext;
        // restore alpha test state 恢复最初测试状态
        //if (this.alphaThreshold < 1) {
        // XXX: we need to find a way to restore the shaders of the stencil node and its children
        //xxx:我们需要找到一种恢复模板和它子节点shader的方法
        //}

        // restore the depth test state 恢复深度测试状态
        gl.depthMask(this._currentDepthWriteMask);

        ///////////////////////////////////
        // DRAW CONTENT 绘制内容

        // setup the stencil test func like this: 以下是创建模板测试函数的方法
        // for each pixel of this node and its childs  对于节点的每个像素和它的节点
        //     if all layers less than or equals to the current are set to 1 in the stencil buffer 如果所有图层不大于当前将模板缓存置1
        //         draw the pixel and keep the current layer in the stencil buffer 绘制像素且保持当前图层在模板缓存中
        //     else 
        //         do not draw the pixel but keep the current layer in the stencil buffer 不绘制且保持当前图层在模板缓存中
        gl.stencilFunc(gl.EQUAL, this._mask_layer_le, this._mask_layer_le);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    },

    _onAfterVisit: function(ctx){
        var gl = ctx || cc._renderContext;
        ///////////////////////////////////
        // CLEANUP

        // manually restore the stencil state 手动恢复模板状态
        gl.stencilFunc(this._currentStencilFunc, this._currentStencilRef, this._currentStencilValueMask);
        gl.stencilOp(this._currentStencilFail, this._currentStencilPassDepthFail, this._currentStencilPassDepthPass);
        gl.stencilMask(this._currentStencilWriteMask);
        if (!this._currentStencilEnabled)
            gl.disable(gl.STENCIL_TEST);

        // we are done using this layer, decrement 这个图层使用完毕 渐减
        cc.ClippingNode._layer--;
    },

    _visitForCanvas: function (ctx) {
        // Composition mode, costy but support texture stencil 合成模式，消耗高但是支持结构模板
        this._clipElemType = (this._cangodhelpme() || this._stencil instanceof cc.Sprite);

        var context = ctx || cc._renderContext;
        var i, children = this._children, locChild;

        if (!this._stencil || !this._stencil.visible) {
            if (this.inverted)
                cc.Node.prototype.visit.call(this, ctx);   // draw everything
            return;
        }

        if(this._rendererSaveCmd)
            cc.renderer.pushRenderCommand(this._rendererSaveCmd);

        if(this._clipElemType){

            // Draw everything first using node visit function 首次使用节点访问函数绘制
            cc.Node.prototype.visit.call(this, context);
        }else{
            this._stencil.visit(context);
        }

        if(this._rendererClipCmd)
            cc.renderer.pushRenderCommand(this._rendererClipCmd);

        this.transform();

        if(this._clipElemType){
            this._stencil.visit();
        }else{
            // Clip mode doesn't support recusive stencil, so once we used a clip stencil,裁剪模式不支持递归模板，所以一旦使用裁剪模板
            // so if it has ClippingNode as a child, the child must uses composition stencil.如果存在ClippingNode作为子节点，这个子节点必须使用合成模板
            this._cangodhelpme(true);
            var len = children.length;
            if (len > 0) {
                this.sortAllChildren();
                // draw children zOrder < 0
                for (i = 0; i < len; i++) {
                    locChild = children[i];
                    if (locChild._localZOrder < 0)
                        locChild.visit(context);
                    else
                        break;
                }
                if(this._rendererCmd)
                    cc.renderer.pushRenderCommand(this._rendererCmd);
                for (; i < len; i++) {
                    children[i].visit(context);
                }
            } else
            if(this._rendererCmd)
                cc.renderer.pushRenderCommand(this._rendererCmd);
            this._cangodhelpme(false);

        }

        if(this._rendererRestoreCmd)
            cc.renderer.pushRenderCommand(this._rendererRestoreCmd);
    },

    /**
     * The cc.Node to use as a stencil to do the clipping.   使用cc.Node作为模板进行裁剪                                <br/>
     * The stencil node will be retained. This default to nil. 模板节点将会被保留，此项默认为0
     * @return {cc.Node}
     */
    getStencil: function () {
        return this._stencil;
    },

    /**
     * Set stencil.设置模板
     * @function
     * @param {cc.Node} stencil
     */
    setStencil: null,

    _setStencilForWebGL: function (stencil) {
        if(this._stencil == stencil)
            return;
        if(this._stencil)
            this._stencil._parent = null;
        this._stencil = stencil;
        if(this._stencil)
            this._stencil._parent = this;
    },

    _setStencilForCanvas: function (stencil) {
        this._stencil = stencil;
        if(stencil._buffer){
            for(var i=0; i<stencil._buffer.length; i++){
                stencil._buffer[i].isFill = false;
                stencil._buffer[i].isStroke = false;
            }
        }
        var locContext = cc._renderContext;
        // For texture stencil, use the sprite itself 对于结构模板，使用本身子画面
        //if (stencil instanceof cc.Sprite) {
        //    return;
        //}
        // For shape stencil, rewrite the draw of stencil ,only init the clip path and draw nothing.
        //对于尖锐模板，重写模板的draw，只需初始化裁剪路径，不必重新绘制
        //else
        if (stencil instanceof cc.DrawNode) {
            stencil._rendererCmd.rendering = function (ctx, scaleX, scaleY) {
                scaleX = scaleX || cc.view.getScaleX();
                scaleY = scaleY ||cc.view.getScaleY();
                var context = ctx || cc._renderContext;
                var t = this._node._transformWorld;
                context.save();
                context.transform(t.a, t.b, t.c, t.d, t.tx * scaleX, -t.ty * scaleY);

                context.beginPath();
                for (var i = 0; i < stencil._buffer.length; i++) {
                    var vertices = stencil._buffer[i].verts;
                    //cc.assert(cc.vertexListIsClockwise(vertices),
                    //    "Only clockwise polygons should be used as stencil"); 只有顺时针多边形能被用作模板

                    var firstPoint = vertices[0];
                    context.moveTo(firstPoint.x * scaleX, -firstPoint.y * scaleY);
                    for (var j = 1, len = vertices.length; j < len; j++)
                        context.lineTo(vertices[j].x * scaleX, -vertices[j].y * scaleY);
                }
                context.restore();
            };
        }
    },

    /**
     * <p>
     * The alpha threshold.                                                                                   <br/>
     * The content is drawn only where the stencil have pixel with alpha greater than the alphaThreshold.  
     *  只有模板存在比alphaThreshold大的像素的时候才会绘制<br/>
     * Should be a float between 0 and 1.  
     * 是0-1之间的浮点数<br/>
     * This default to 1 (so alpha test is disabled). 默认为1，(所以aplha test不可用)
     * </P>
     * @return {Number}
     */
    getAlphaThreshold: function () {
        return this.alphaThreshold;
    },

    /**
     * set alpha threshold.设置alpha threshold
     * @param {Number} alphaThreshold
     */
    setAlphaThreshold: function (alphaThreshold) {
        this.alphaThreshold = alphaThreshold;
    },

    /**
     * <p>
     *     Inverted. If this is set to YES,  如果是倒置                                                               <br/>
     *     the stencil is inverted, so the content is drawn where the stencil is NOT drawn.                 <br/>
     *     模板是倒置的，所以当模板不在绘制时才会绘制内容
     *     This default to NO. 默认为NO
     * </p>
     * @return {Boolean}
     */
    isInverted: function () {
        return this.inverted;
    },

    /**
     * set whether or not invert of stencil 设置模板是否倒置
     * @param {Boolean} inverted
     */
    setInverted: function (inverted) {
        this.inverted = inverted;
    },

    _cangodhelpme: function (godhelpme) {
        if (godhelpme === true || godhelpme === false)
            cc.ClippingNode.prototype._godhelpme = godhelpme;
        return cc.ClippingNode.prototype._godhelpme;
    },

    _transformForRenderer: function(parentMatrix){
        cc.Node.prototype._transformForRenderer.call(this, parentMatrix);
        if(this._stencil)
            this._stencil._transformForRenderer(this._stackMatrix);
    }
});

var _p = cc.ClippingNode.prototype;

if (cc._renderType === cc._RENDER_TYPE_WEBGL) {
    //WebGL
    _p.init = _p._initForWebGL;
    _p.visit = _p._visitForWebGL;
    _p.setStencil = _p._setStencilForWebGL;
} else {
    _p.init = _p._initForCanvas;
    _p.visit = _p._visitForCanvas;
    _p.setStencil = _p._setStencilForCanvas;
}

// Extended properties
cc.defineGetterSetter(_p, "stencil", _p.getStencil, _p.setStencil);
/** @expose */
_p.stencil;


cc.ClippingNode._init_once = null;
cc.ClippingNode._visit_once = null;
cc.ClippingNode._layer = -1;
cc.ClippingNode._sharedCache = null;

cc.ClippingNode._getSharedCache = function () {
    return (cc.ClippingNode._sharedCache) || (cc.ClippingNode._sharedCache = document.createElement("canvas"));
};

/**
 * Creates and initializes a clipping node with an other node as its stencil. <br/>
 *通过一个节点作为模板创建、初始化另一个节点
 * The stencil node will be retained. 模板节点会被保留
 * @deprecated since v3.0, please use "new cc.ClippingNode(stencil)" instead 
 * v3.0以后不赞成使用，建议使用"new cc.ClippingNode(stencil)"替代
 * @param {cc.Node} [stencil=null]
 * @return {cc.ClippingNode}
 * @example
 * //example
 * new cc.ClippingNode(stencil);
 */
cc.ClippingNode.create = function (stencil) {
    return new cc.ClippingNode(stencil);
};
