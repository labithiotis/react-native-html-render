import React from 'react-native';
import {parseHtml, inlineTagArr, blockTagArr} from './htmlParse';

const BULLET = '  \u2022  '
const LINE_BREAK = '\n'

export const inlineTags = inlineTagArr
export const blockTags = blockTagArr

var {
    StyleSheet,
    Text,
    View,
    Component,
    Image,
    ScrollView,
    TouchableHighlight,
    TouchableOpacity,
    LinkingIOS,
    PropTypes,
    Dimensions
    } = React

var {height,width} = Dimensions.get('window')

function rendCodeBlock(codeText, styles) {
    var codeLines = codeText.split('\n')
    return codeLines.map(function (line, index, arr) {
        var lineNum = index + 1;
        if (line == '') line = '\n';
        if (index == codeLines.length - 1) return null;
        return (
            <View key={'codeRow'+index} style={styles.codeRow}>
                <View style={styles.lineNumWrapper}>
                    <Text style={styles.lineNum}>
                        {lineNum + '.'}
                    </Text>
                </View>

                <View style={styles.codeLineWrapper}>
                    <Text style={styles.codeLine}>
                        {line}
                    </Text>
                </View>
            </View>
        )
    });
}

function getCodeRowStyle(num, length, styles) {
    if (num == 1 && length == num) {
        return [styles.codeRow, styles.codeFirstAndLastRow]
    }

    if (num == 1) {
        return [styles.codeRow, styles.codeFirstRow];
    }
    if (num == length) {
        return [styles.codeRow, styles.codeLastRow];
    }

    return styles.codeRow;
}

export class HtmlView extends Component {

    static propTypes = {
        value: PropTypes.string,
        debug: PropTypes.bool,
        debugInline: PropTypes.bool,
        stylesheet: PropTypes.object,
        onLinkPress: PropTypes.func,
        renderNode: PropTypes.func
    };

    constructor(props) {
        super(props)
        this.state = {
            element: null
        }
    }

    componentWillReceiveProps() {
        if (this.state.element) return
        this._startHtmlRender()
    }

    componentDidMount() {
        this._startHtmlRender()
    }

    _startHtmlRender() {
        if (!this.props.value) return
        if (this.renderingHtml) return

        var opts = {
            linkHandler: this.props.onLinkPress,
            styles: Object.assign({}, baseStyles, this.props.stylesheet),
            customRenderer: this.props.renderNode
        }

        this.renderingHtml = true
        this._htmlToElement(this.props.value, opts, (err, element) => {

            this.renderingHtml = false

            if (err) return (this.props.onError || console.error)(err);

            this.setState({
                element: element
            });

        });
    }

    _htmlToElement(rawHtml, opts, done) {

        parseHtml(rawHtml, (dom) => {
            done(null, this.renderNodeToElement(dom, null, 'block', opts))
        });

    }

    renderNodeToElement(dom, parent, type, opts) {

        if (!dom) return null;

        let styles = opts.styles;

        return dom.map((node, index, list) => {

            let name = node.name;

            node.index = index;

            index = (parent ? parent.index + '-' : '' ) + index;
            node.tree = (parent ? parent.tree + '>' : '' ) + node.name;

            if(this.props.debug) console.log('T:', node.tree, '| A:', node.attribs, '| C:', (node.children || []).length);

            if (opts.customRenderer) {
                let rendered = opts.customRenderer(node, index, parent, type);
                if (rendered || rendered === null) return rendered
            }

            if (node.type === 'block' && name === 'div' && (!node.children || (!node.children && !node.text))) return null;
            if (node.type === 'inline' && type === 'inline' && name === 'text' && !node.text) return null;
            if (node.type == 'inline' && type == 'block') return null;

            if (name == 'text' && type == 'inline') {
                // ignore carriage return
                if (node.text.charCodeAt() === 13) return null;
                return (
                    <Text key={index} style={[styles.text, styles[parent.name]]}>
                        {node.text}
                    </Text>
                )
            }

            if (node.type == 'inline') {

                if (name == 'a') {
                    return (
                        <Text
                            onPress={opts.linkHandler.bind(this, node.attribs.href)}
                            key={index} style={[styles.text, styles[name]]}>
                            {this.renderNodeToElement(node.children, node, 'inline', opts)}
                        </Text>
                    )
                }

                return (
                    <Text key={index} style={[styles.text, styles[name]]}>
                        {this.renderNodeToElement(node.children, node, 'inline', opts)}
                        {node.name == 'br' ? LINE_BREAK : null}
                    </Text>
                )
            }

            if (node.type == 'block' && type == 'block') {

                if (name == 'img') {
                    return (
                        <View
                            key={index}
                            style={styles.imgWrapper}>
                            <Image source={{uri: node.attribs.src}}
                                   style={styles.img}>
                            </Image>
                        </View>
                    )
                }

                if (name == 'code') {

                    var codeText = '';

                    node.children.forEach(function (code) {
                        codeText = codeText + code.text;
                    });

                    return (
                        <ScrollView
                            style={styles.codeScrollView}
                            horizontal={true}>
                            <View style={styles.codeWrapper}>
                                {rendCodeBlock(codeText, styles)}
                            </View>
                        </ScrollView>
                    )

                }

                const childrenInline = this.renderNodeToElement(node.children, node, 'inline', opts);
                const childrenBlock = this.renderNodeToElement(node.children, node, 'block', opts);

                return (
                    <View key={index} style={styles[name + 'Wrapper']}>
                        {this.props.debugInline ?
                            <Text style={[{color: '#ff0000'}, styles.text]}>
                                {node.index + ' ' + node.tree + (node.attribs.class ? ' (' + node.attribs.class + ')' : '' )
                                + childrenInline.length + ':' + childrenBlock.length}
                            </Text>
                            : null
                        }
                        { childrenBlock.length === 0 ?
                            <Text style={styles.text}>
                                {node.name == 'li' ? BULLET : null}
                                {childrenInline}
                            </Text>
                            : null
                        }
                        { childrenBlock }
                    </View>
                )

            }

        }).filter(e => { return e === 0 || e })

    }

    render() {
        if (this.state.element) {
            return <View children={this.state.element} style={{flex:1}}/>
        }
        return <View />
    }
}

var fontSize = 16
var titleMargin = 15
var liFontSize = fontSize - 2

var baseStyles = StyleSheet.create({
    img: {
        flex: 1,
		    resizeMode: Image.resizeMode.ratio
    },
    imgWrapper: {
    		height: 200
    },
    p: {
        lineHeight: fontSize * 1.5,
        fontSize: fontSize,
        paddingTop: 5,
        paddingBottom: 5,
        color: 'rgba(0,0,0,0.8)'
    },
    pWrapper: {
        marginTop: 15,
        marginBottom: 15
    },
    a: {
        color: '#3498DB',
        fontSize: fontSize,
        paddingLeft: 4,
        paddingRight: 4,
        marginRight: 10,
        marginLeft: 10,
        fontFamily: 'Courier'
    },
    h1: {
        fontSize: fontSize * 1.6,
        fontWeight: "bold",
        color: 'rgba(0,0,0,0.8)'
    },
    h1Wrapper: {
        marginTop: titleMargin,
        marginBottom: titleMargin
    },
    h2: {
        fontSize: fontSize * 1.5,
        fontWeight: 'bold',
        color: 'rgba(0,0,0,0.85)'
    },
    h2Wrapper: {
        marginBottom: titleMargin,
        marginTop: titleMargin
    },
    h3: {
        fontWeight: 'bold',
        fontSize: fontSize * 1.4,
        color: 'rgba(0,0,0,0.8)'
    },
    h3Wrapper: {
        marginBottom: titleMargin - 2,
        marginTop: titleMargin - 2
    },
    h4: {
        fontSize: fontSize * 1.3,
        color: 'rgba(0,0,0,0.7)',
        fontWeight: 'bold'
    },
    h4Wrapper: {
        marginBottom: titleMargin - 2,
        marginTop: titleMargin - 2,
    },
    h5: {
        fontSize: fontSize * 1.2,
        color: 'rgba(0,0,0,0.7)',
        fontWeight: 'bold'
    },
    h5Wrapper: {
        marginBottom: titleMargin - 3,
        marginTop: titleMargin - 3,
    },
    h6: {
        fontSize: fontSize * 1.1,
        color: 'rgba(0,0,0,0.7)',
        fontWeight: 'bold'
    },
    h6Wrapper: {
        marginBottom: titleMargin - 3,
        marginTop: titleMargin - 3,
    },
    li: {
        fontSize: fontSize * 0.9,
        color: 'rgba(0,0,0,0.7)'
    },
    liWrapper: {
        paddingLeft: 20,
        marginBottom: 10
    },
    strong: {
        fontWeight: 'bold'
    },
    em: {
        fontStyle: 'italic'
    },
    code: {
        color: '#E74C3C',
        paddingLeft: 5,
        paddingRight: 5,
        fontFamily: 'Courier'

    },
    codeScrollView: {
        backgroundColor: '#333',
        flexDirection: 'column',
        marginBottom: 15
    },
    codeRow: {
        flex: 1,
        flexDirection: 'row',
        height: 25,
        alignItems: 'center'
    },
    codeFirstRow: {
        paddingTop: 20,
        height: 25 + 20
    },
    codeLastRow: {
        paddingBottom: 20,
        height: 25 + 20
    },
    codeFirstAndLastRow: {
        paddingBottom: 20,
        height: 25 + 40,
        paddingTop: 20
    },
    lineNum: {
        width: 55,
        color: 'rgba(255,255,255,0.5)',
    },
    lineNumWrapper: {
        width: 55,
        height: 25,
        backgroundColor: 'rgba(0,0,0,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
    },
    codeLine: {
        color: '#E74C3C',
        fontFamily: 'Courier'
    },
    codeWrapper: {
        flexDirection: 'column'
    },
    codeLineWrapper: {
        height: 25,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 20
    },
    blockquoteWrapper: {
        paddingLeft: 20,
        borderLeftColor: '#3498DB',
        borderLeftWidth: 3
    }
});
