export default function ({ types: t }) {

  const attachCallToStore = (path, functionName) => {
    let vPathNode = path.node.arguments[0];
    let operationValue = path.node.arguments[1];
    let vPath = [toVirtualPathSegment(vPathNode)];

    while (vPathNode.property.name !== "state" || contains(vPathNode.object, "state")) {
      if (!t.isMemberExpression(vPathNode)) {
        throw new Error("vPath must contain keyword state.");
      }
      vPathNode = vPathNode.object;
      vPath.unshift(toVirtualPathSegment(vPathNode));
    }

    path.replaceWith(
      t.callExpression(
        t.memberExpression(
          vPathNode.object,
          t.identifier(functionName)
        ),
        operationValue
          ? [t.arrayExpression(vPath), operationValue]
          : [t.arrayExpression(vPath)]
      ));
  };

  const createSubStore = (path, functionName) => {
    let vPathNode = path.node.arguments[0];
    let vPath = [toVirtualPathSegment(vPathNode)];

    if (!t.isMemberExpression(vPathNode)) {
      return;
    }

    while (vPathNode.property.name !== "state") {
      if (!t.isMemberExpression(vPathNode)) {
        return;
      }
      vPathNode = vPathNode.object;
      vPath.unshift(toVirtualPathSegment(vPathNode));
    }

    path.node.arguments[0] = t.callExpression(
      t.memberExpression(
        vPathNode.object,
        t.identifier("getSubStore")
      ),
      [t.arrayExpression(vPath)]
    );

  };

  const easmCoreMethods = {
    "get": attachCallToStore,
    "set": attachCallToStore,
    "push": attachCallToStore,
    "pop": attachCallToStore,
    "shift": attachCallToStore,
    "unshift": attachCallToStore,
    "merge": attachCallToStore,
  };

  const easmReactMethods = {
    "createAdapter": createSubStore,
    "createHook": createSubStore,
  };

  const modifiers = {
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

  const ensureNameIsModuleLevelImport = (scope, name) => {
    const binding = scope.getBinding(name);
    if (!binding) return null;
    if (t.isVariableDeclarator(binding.path.node) && binding.path.node.init) {
      return ensureNameIsModuleLevelImport(binding.path.scope, binding.path.node.init.name);
    }
    return binding.kind === 'module'
      ? name
      : null;
  };

  const isPlainPropertyAccess = (property, computed) => {
    return (
      (t.isIdentifier(property) && computed === false) ||
      (t.isLiteral(property) && property.value)
    )
  };

  const toVirtualPathSegment = (node) => {
    return (isPlainPropertyAccess(node.property, node.computed))
      ? t.stringLiteral(
        t.isLiteral(node.property)
          ? node.property.value.toString()
          : node.property.name)
      : node.property;
  };

  const contains = (obj, name) => {
    return (t.isIdentifier(obj) ? obj.name === name : obj.property.name === name) ||
      (t.isMemberExpression(obj) && contains(obj.object, name));
  }

  return {
    visitor: {
      ImportDeclaration(path) {
        const {
          node: {
            source: { value: importLocation },
          },
        } = path;

        const currentModule = modifiers[importLocation];
        if (currentModule) {
          const { specifiers } = path.node;

          const namespaceImport = specifiers.find((specifier) =>
            t.isImportNamespaceSpecifier(specifier)
          );

          if (namespaceImport !== undefined) {
            currentModule.namespace = namespaceImport.local.name;
          }

          const importSpecifiers = specifiers.filter((specifer) =>
            t.isImportSpecifier(specifer)
          );

          for (const {
            imported: { name: importName },
            local: { name: localName },
          } of importSpecifiers) {
            if (Object.keys(currentModule.methodNames).some(name => name === importName)) {
              currentModule.importedVariable[localName] = importName;
            }
          };
        }
      },
      CallExpression(path) {

        const { callee } = path.node;

        if (!t.isIdentifier(callee) && !t.isMemberExpression(callee)) return;

        const importName = ensureNameIsModuleLevelImport(
          path.scope,
          callee.name || (callee.object && callee.object.name)
        );
        if (!importName) return;

        for (let key in modifiers) {
          const mod = modifiers[key];
          let targetExpression;
          let functionName = importName;

          let modifierMethod = null;
          if (mod.namespace && functionName === mod.namespace) {
            functionName = callee.property.name;

            modifierMethod = mod.methodNames[functionName];
            if (!modifierMethod) { continue; }

            targetExpression = t.memberExpression(
              t.identifier(importName),
              t.identifier(functionName)
            );

          } else {
            modifierMethod = mod.importedVariable[functionName] && mod.methodNames[mod.importedVariable[functionName]];
            if (!modifierMethod) { continue; }
            targetExpression = t.identifier(functionName);
          }

          modifierMethod(path, mod.importedVariable[functionName]);

        }
      }
    },
  }
}