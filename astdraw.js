
const nodeWidth = 100;
const nodeSpacing = 20;
const nodeHeight = 50;
const linkHeight = 30;
const textSize = 24;
const canvasMargin = 32;
// draw a node, returns the width and height
function setNodeSize(node) {
    let width = 0;
    let height = 0;

    if (node.children != null) {

        for (let child = 0; child < node.children.length; child++) {
            node.children[child] = setNodeSize(node.children[child]);
            
            width += node.children[child].width;
            if (child != 0)
                width += nodeSpacing;
            
            height = Math.max(height, node.children[child].height);
        }
    }

    // min width
    width = Math.max(width, nodeWidth);

    // add the root height
    height += nodeHeight;
    if (node.children != null && node.children.length != 0)
        height += linkHeight;
    
    node.width = width;
    node.height = height;
    return node;
}

let scaleFactor = 1.0;

function drawCurve(ctx, startX, startY, endX, endY, sideDilation) {
    const numSegments = 8;

    ctx.beginPath();
    ctx.lineWidth = 1.0;

    ctx.moveTo(startX, startY);
    for (let i = 1; i <= numSegments; i++) {
        const along = i / numSegments;
        let posX = startX + (endX - startX) * Math.pow(along, 1 / sideDilation);
        let posY = startY + (endY - startY) * along;
        ctx.lineTo(posX, posY);
        ctx.moveTo(posX, posY);
    }

    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
}

function drawNode(ctx, node, posX, posY) {
    // console.log(`draw ${node.name} at ${posX}, ${posY}`);

    ctx.fillText(node.name, posX, posY + (textSize * scaleFactor / 2.0) + (nodeHeight * scaleFactor / 2.0));

    ctx.beginPath();
    // ctx.rect(posX - (nodeWidth * scaleFactor / 2.0), posY, nodeWidth * scaleFactor, nodeHeight * scaleFactor);
    ctx.lineWidth = 2.0;
    ctx.roundRect(posX - (nodeWidth * scaleFactor / 2.0), posY, nodeWidth * scaleFactor, nodeHeight * scaleFactor, 4);
    
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    posY += nodeHeight * scaleFactor;

    let width = node.width;
    let height = node.height;

    width *= scaleFactor;
    height *= scaleFactor;

    if (node.children != null) {
        let xoffset = posX - width / 2.0;
        for (let childIndex = 0; childIndex < node.children.length; childIndex++) {
            const child = node.children[childIndex];
            
            xoffset += child.width / 2.0 * scaleFactor;
            let yoffset = posY + linkHeight * scaleFactor;
            drawNode(ctx, child, xoffset, yoffset);

            // ctx.beginPath();
            // ctx.lineWidth = 1.0;
            // ctx.moveTo(posX, posY);
            // ctx.lineTo(xoffset, yoffset);
            // ctx.strokeStyle = '#ffffff';
            // ctx.stroke();
            let dilate = 1 + Math.abs(xoffset - posX) / (300.0 * scaleFactor);
            drawCurve(ctx, posX, posY, xoffset, yoffset, dilate);

            xoffset += child.width / 2.0 * scaleFactor;
            if (child != 0)
                xoffset += nodeSpacing * scaleFactor;
        }
    }
}

function drawAST(inAst) {
    let targetContainer = $(".table-container")[0];

    let canvas = $("#ast-canvas")[0];

    // setup the resolution
    canvas.width = targetContainer.offsetWidth * 1.25;
    canvas.height = targetContainer.offsetHeight * 1.25;

    const ctx = canvas.getContext("2d");
    if (canvas.width == 0 || canvas.height == 0)
        return;
    
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.textAlign = "center";

    if (inAst == null)
        inAst = [];
    
    let ast = {
        "name": "Root",
        "children": inAst
    };

    // get the size of the thing, try to fit it to the canvas
    ast = setNodeSize(ast);

    let width = ast.width;
    let height = ast.height + canvasMargin * 2;

    scaleFactor = Math.min(canvas.width / width, canvas.height / height);

    if (scaleFactor > 1.5)
        scaleFactor = 1.5;
    
    ctx.font = (textSize * scaleFactor).toString() + "px serif";

    let centerX = canvas.width / 2.0;
    let centerY = canvas.height / 2.0;
    
    let rootPosX = centerX;
    let rootPosY = 0;

    // console.log(`draw AST canvas ${canvas.width} ${canvas.height} (orig size ${ast.width} ${ast.height}) at (${rootPosX} ${rootPosY}), scale ${scaleFactor}`);

    drawNode(ctx, ast, rootPosX, rootPosY + canvasMargin * scaleFactor);
}