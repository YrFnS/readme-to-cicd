"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowPreview = void 0;
const react_1 = __importStar(require("react"));
const WorkflowPreview = ({ workflow, editMode, onContentChange }) => {
    const [validation, setValidation] = (0, react_1.useState)({
        isValid: true,
        issues: [],
        yamlSyntaxValid: true,
        githubActionsValid: true
    });
    const [content, setContent] = (0, react_1.useState)(workflow.content);
    const textareaRef = (0, react_1.useRef)(null);
    const preRef = (0, react_1.useRef)(null);
    // Update content when workflow changes
    (0, react_1.useEffect)(() => {
        setContent(workflow.content);
    }, [workflow.content]);
    // Validate YAML content
    (0, react_1.useEffect)(() => {
        validateWorkflow(content);
    }, [content]);
    const validateWorkflow = async (yamlContent) => {
        try {
            // Basic YAML syntax validation
            const lines = yamlContent.split('\n');
            const issues = [];
            // Check for common YAML issues
            lines.forEach((line, index) => {
                const lineNumber = index + 1;
                // Check for tab characters (YAML should use spaces)
                if (line.includes('\t')) {
                    issues.push({
                        line: lineNumber,
                        column: line.indexOf('\t') + 1,
                        message: 'YAML should use spaces, not tabs for indentation',
                        severity: 'error',
                        code: 'YAML_TAB_INDENTATION'
                    });
                }
                // Check for inconsistent indentation
                const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
                if (leadingSpaces > 0 && leadingSpaces % 2 !== 0) {
                    issues.push({
                        line: lineNumber,
                        column: 1,
                        message: 'Inconsistent indentation. Use 2 spaces per level',
                        severity: 'warning',
                        code: 'YAML_INDENTATION'
                    });
                }
                // Check for GitHub Actions specific patterns
                if (line.trim().startsWith('uses:')) {
                    const actionMatch = line.match(/uses:\s*(.+)/);
                    if (actionMatch) {
                        const action = actionMatch[1].trim();
                        if (!action.includes('@') && !action.startsWith('./')) {
                            issues.push({
                                line: lineNumber,
                                column: line.indexOf(action) + 1,
                                message: 'Action should specify a version (e.g., @v1, @main)',
                                severity: 'warning',
                                code: 'GITHUB_ACTION_VERSION'
                            });
                        }
                    }
                }
            });
            setValidation({
                isValid: issues.filter(i => i.severity === 'error').length === 0,
                issues,
                yamlSyntaxValid: issues.filter(i => i.code?.startsWith('YAML_')).length === 0,
                githubActionsValid: issues.filter(i => i.code?.startsWith('GITHUB_')).length === 0
            });
        }
        catch (error) {
            setValidation({
                isValid: false,
                issues: [{
                        line: 1,
                        column: 1,
                        message: 'Invalid YAML syntax',
                        severity: 'error',
                        code: 'YAML_SYNTAX_ERROR'
                    }],
                yamlSyntaxValid: false,
                githubActionsValid: false
            });
        }
    };
    const handleContentChange = (newContent) => {
        setContent(newContent);
        onContentChange(newContent);
    };
    const syntaxHighlight = (yamlContent) => {
        return yamlContent
            // Keywords (on, push, pull_request, etc.)
            .replace(/^(\s*)(on|push|pull_request|schedule|workflow_dispatch|jobs|steps|runs-on|uses|with|env|if|needs):/gm, '$1<span class="yaml-keyword">$2</span>:')
            // String values
            .replace(/:\s*(['"]).+?\1/g, (match) => match.replace(/(['"]).+?\1/, '<span class="yaml-string">$&</span>'))
            // Unquoted string values
            .replace(/:\s*([^#\n\r]+?)(\s*#|$)/g, (match, value, ending) => `: <span class="yaml-value">${value.trim()}</span>${ending}`)
            // Comments
            .replace(/#.*/g, '<span class="yaml-comment">$&</span>')
            // Numbers
            .replace(/:\s*(\d+)/g, ': <span class="yaml-number">$1</span>')
            // Booleans
            .replace(/:\s*(true|false)/g, ': <span class="yaml-boolean">$1</span>')
            // Action references
            .replace(/(uses:\s*)(.+)/g, '$1<span class="yaml-action">$2</span>');
    };
    const getLineNumbers = (content) => {
        const lines = content.split('\n');
        return lines.map((_, index) => index + 1).join('\n');
    };
    const handleScroll = (e) => {
        if (preRef.current) {
            preRef.current.scrollTop = e.currentTarget.scrollTop;
            preRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };
    const renderValidationIssues = () => {
        if (validation.issues.length === 0)
            return null;
        return (<div className="validation-issues">
        <h4>Validation Issues</h4>
        {validation.issues.map((issue, index) => (<div key={index} className={`validation-issue ${issue.severity}`}>
            <span className="issue-location">Line {issue.line}:{issue.column}</span>
            <span className="issue-message">{issue.message}</span>
            {issue.code && <span className="issue-code">{issue.code}</span>}
          </div>))}
      </div>);
    };
    return (<div className="workflow-preview">
      <div className="preview-header">
        <div className="workflow-info">
          <h3>{workflow.name}</h3>
          <span className="workflow-path">{workflow.path}</span>
          <span className="workflow-size">{workflow.size} bytes</span>
        </div>
        
        <div className="validation-status">
          {validation.isValid ? (<span className="status-valid">✅ Valid</span>) : (<span className="status-invalid">❌ {validation.issues.filter(i => i.severity === 'error').length} errors</span>)}
          {validation.issues.filter(i => i.severity === 'warning').length > 0 && (<span className="status-warnings">⚠️ {validation.issues.filter(i => i.severity === 'warning').length} warnings</span>)}
        </div>
      </div>

      <div className="preview-content">
        {editMode ? (<div className="editor-container">
            <div className="line-numbers">
              <pre>{getLineNumbers(content)}</pre>
            </div>
            <textarea ref={textareaRef} className="yaml-editor" value={content} onChange={(e) => handleContentChange(e.target.value)} onScroll={handleScroll} spellCheck={false} wrap="off"/>
          </div>) : (<div className="syntax-highlighted">
            <div className="line-numbers">
              <pre>{getLineNumbers(content)}</pre>
            </div>
            <pre ref={preRef} className="yaml-content" dangerouslySetInnerHTML={{ __html: syntaxHighlight(content) }}/>
          </div>)}
      </div>

      {validation.issues.length > 0 && renderValidationIssues()}

      <div className="preview-footer">
        <div className="workflow-stats">
          <span>Lines: {content.split('\n').length}</span>
          <span>Characters: {content.length}</span>
          <span>Language: {workflow.language.toUpperCase()}</span>
        </div>
        
        {editMode && (<div className="editor-help">
            <p>💡 Use Ctrl+S to save changes, Esc to exit edit mode</p>
          </div>)}
      </div>
    </div>);
};
exports.WorkflowPreview = WorkflowPreview;
//# sourceMappingURL=WorkflowPreview.js.map