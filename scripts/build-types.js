const fs = require('fs');
const path = require('path');

function copyAndRenameFiles(src, dest) {
  if (src.startsWith('.')) {
    src = path.join(__dirname, src);
  }
  if (dest.startsWith('.')) {
    dest = path.join(__dirname, dest);
  }

  // Read the contents of the source directory
  const entries = fs.readdirSync(src, {withFileTypes: true});
  // if (err) {
  //   console.error(`Error reading directory ${src}:`, err);
  //   return;
  // }

  // Iterate over each entry in the directory
  entries.forEach(entry => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name.replace('.d.ts', '.txt'));

    if (entry.isDirectory()) {
      // If the entry is a directory, create the corresponding directory in the destination
      fs.mkdirSync(destPath, {recursive: true});
      // if (err) {
      //   console.error(`Error creating directory ${destPath}:`, err);
      //   return;
      // }
      // Recursively copy files in the subdirectory
      copyAndRenameFiles(srcPath, destPath);
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      // If the entry is a .d.ts file, copy and rename it
      fs.cpSync(srcPath, destPath);
      // if (err) {
      //   console.error(
      //     `Error copying file from ${srcPath} to ${destPath}:`,
      //     err
      //   );
      // } else {
      // }
      console.log(`Copied and renamed ${srcPath} to ${destPath}`);
    }
  });
}

function generateImportStatements(src, output) {
  const sourceRelative = src;

  if (src.startsWith('.')) {
    src = path.join(__dirname, src);
  }
  if (output.startsWith('.')) {
    output = path.join(__dirname, output);
  }

  let importStatements = '';

  function traverseDirectory(currentPath) {
    fs.readdirSync(currentPath, {withFileTypes: true}).forEach(entry => {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        traverseDirectory(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        let relativePath = path.relative(__dirname, entryPath);
        relativePath = relativePath.replace(`${sourceRelative}/`, '');
        const importPath = `./${relativePath.replace(/\\/g, '/')}`;
        const variableName = relativePath
          .replace(/(\\|\/|-)/g, '_')
          .replace('.txt', '');

        importStatements += `import ${variableName} from '${importPath}?raw';\n`;
      }
    });
  }

  traverseDirectory(src);

  fs.writeFileSync(output, importStatements, 'utf8');
  console.log(`Generated import statements in ${output}`);
}

function transformImportsToTypeArray(pkgName, input) {
  if (input.startsWith('.')) {
    input = path.join(__dirname, input);
  }

  // Read the input file
  const fileContent = fs.readFileSync(input, 'utf8');

  // Regular expression to match import statements
  const importRegex = /import\s+(\w+)\s+from\s+'(.+?\.txt)\?raw';/g;

  // Array to hold the transformed lines
  const typeArrayEntries = [];

  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    const variableName = match[1];
    let filePath = match[2].replace('.txt', '.d.ts');
    filePath = filePath.replace('./', '');
    typeArrayEntries.push(`[${variableName}, getPath('${filePath}')]`);
  }

  // Create the output content
  const outputContent = `
${fileContent}

const prefix = 'file:///node_modules/@types/${pkgName}/';
const getPath = (str) => prefix + str;

export const typeArray = [\n  ${typeArrayEntries.join(',\n  ')}\n];\n`;

  // Write the output content to the output file
  fs.writeFileSync(input, outputContent, 'utf8');
  console.log(`Transformed content written to ${input}`);
}

function generateTypes(pkgName) {
  const typeRelativeSource = `../dist/types/packages/${pkgName}/src`;
  const distRelativePath = `../dist/typesDist/${pkgName}`;
  const distTypeFile = `${distRelativePath}/types.js`;

  // 删除文件夹
  fs.rmSync(path.join(__dirname, distRelativePath), {
    force: true,
    recursive: true
  });

  // 生成类型文件
  copyAndRenameFiles(typeRelativeSource, distRelativePath);
  generateImportStatements(distRelativePath, distTypeFile);
  transformImportsToTypeArray(pkgName, distTypeFile);
}

// 生成  amis 类型
generateTypes('amis');
// 生成 amisCore 类型
generateTypes('amis-core');
