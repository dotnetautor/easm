import * as ts from 'typescript';

type ModifierMethod = (node: ts.CallExpression, functionName: string) => ts.Node | null ;

type MethodMap = {
  [key: string]: ModifierMethod
}

type ModifierMap = {
  [key: string]: {
    methodNames: MethodMap,
    namespace: string | null,
    importedVariable: {
      [name: string]: string
    }
  }
}

const isStateMemberAccessExpression = (node: ts.Node): boolean => {
  return ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name) && node.name.text === "state";
}

const toVirtualPathSegment = (node: ts.Node): [(ts.StringLiteral | ts.Expression | null), (ts.Expression | null)] => {
  if (ts.isPropertyAccessExpression(node)) {
    return [ts.createStringLiteral(node.name.text), node.expression]; // todo: check is repression has string or number type !!!
  } else if (ts.isElementAccessExpression(node)) {
    return [node.argumentExpression, node.expression]
  }
  return [null, null];
};

const toVirtualPath = (node: ts.Expression): [(ts.Expression | null), ((ts.StringLiteral | ts.Expression)[ ]| null)] => {
  let vPathNode: ts.Expression | null = node;
  let vPathValue: (ts.StringLiteral | ts.Expression | null) = null  ;
  let vPath: (ts.StringLiteral | ts.Expression)[] = [];
  while (vPathNode && !isStateMemberAccessExpression(vPathNode)) {
    [vPathValue, vPathNode] = toVirtualPathSegment(vPathNode);
    if (!vPathValue) return [null, null];
    vPath.unshift(vPathValue);
  }

  if (!vPathNode || !ts.isPropertyAccessExpression(vPathNode)) return [null,null]; // todo: hande .state. not found
  const vPathNodeExpression = vPathNode.expression;
  [vPathValue, vPathNode] = toVirtualPathSegment(vPathNode);
  vPathValue && vPath.unshift(vPathValue);

  return [vPathNodeExpression, vPath];
}

const attachCallToStore = (node: ts.CallExpression, functionName: string): ts.Node | null => {
  const [vPathNodeExpression, vPath] = toVirtualPath(node.arguments[0]);
  const operationValue = node.arguments[1];

  return vPathNodeExpression && vPath && ts.updateCall(node,
      ts.createPropertyAccess(
        vPathNodeExpression,
        ts.createIdentifier(functionName)
      ),
      undefined,
      operationValue
        ? [ts.createArrayLiteral(vPath), operationValue]
        : [ts.createArrayLiteral(vPath)]
    );
};

const createSubStore = (node: ts.CallExpression, functionName: string): ts.Node | null => {
  const [vPathNodeExpression, vPath] = toVirtualPath(node.arguments[0]);

  return vPathNodeExpression && vPath && ts.updateCall(node,
    node.expression,
    undefined,
    [ts.createCall(ts.createPropertyAccess(
      vPathNodeExpression,
      ts.createIdentifier("getSubStore")
    ),
      undefined,
      [ts.createArrayLiteral(vPath)])]

  );
};

const easmCoreMethods: MethodMap = {
  "get": attachCallToStore,
  "set": attachCallToStore,
  "push": attachCallToStore,
  "pop": attachCallToStore,
  "shift": attachCallToStore,
  "unshift": attachCallToStore,
  "merge": attachCallToStore,
};

const easmReactMethods: MethodMap= {
  "createAdapter": createSubStore,
  "createHook": createSubStore,
};

const modifiers : ModifierMap = {
  '@easm/core': {
    methodNames: easmCoreMethods,
    namespace: null,
    importedVariable: {}
  },
  '@easm/core/actions': {
    methodNames: easmCoreMethods,
    namespace: null,
    importedVariable: {}
  },
  '@easm/react': {
    methodNames: easmReactMethods,
    namespace: null,
    importedVariable: {}
  },
  '@easm/react/connect': {
    methodNames: easmReactMethods,
    namespace: null,
    importedVariable: {}
  }
};

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node {
  return ts.visitEachChild(visitNode(node, program), childNode => visitNodeAndChildren(childNode, program, context), context);
}

function visitNode(node: ts.Node, program: ts.Program): ts.Node {
  const checker = program.getTypeChecker();
  // ImportDeclaration
  if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
    const currentModule = modifiers[node.moduleSpecifier.text];
    if (currentModule && node.importClause && node.importClause.namedBindings) {
      // import { set, get as xGet } from "@easm/core"
      if (ts.isNamedImports(node.importClause.namedBindings)) {
        node.importClause.namedBindings.elements.forEach(element => {
          if (ts.isImportSpecifier(element)) {
            const localName = element.name.text;
            const importName = element.propertyName && element.propertyName.text || localName;

            if (Object.keys(currentModule.methodNames).some(name => name === importName)) {
              currentModule.importedVariable[localName] = importName;
            }
          }
        });
      } else {
        // import * as proxy from "@easm/core"
        if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          currentModule.namespace = node.importClause.namedBindings.name.text;
        }
      }
    }
  } else if (ts.isCallExpression(node)) {
    if (!ts.isIdentifier(node.expression) && !ts.isPropertyAccessExpression(node.expression)) return node; // todo: handle error

    for (let key in modifiers) {
      const mod = modifiers[key];
      let functionName = '';
      if (mod.namespace && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && mod.namespace === node.expression.expression.text && ts.isIdentifier(node.expression.name)) {
        // import * as proxy from "@easm/core"
        functionName = node.expression.name.text;
      } else if (ts.isIdentifier(node.expression)) {
        // import { set, get as xGet } from "@easm/core"
        functionName = mod.importedVariable[node.expression.text]
      }
      const modifierMethod = functionName && mod.methodNames[functionName] || undefined;
      if (!modifierMethod) { continue; }
      return modifierMethod(node, mod.importedVariable[functionName]) || node;
    }

  }
  return node;
}