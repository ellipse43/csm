'use strict';

import React from 'react'
import 'whatwg-fetch'
import { DOMParser } from 'react-native-html-parser'
import Drawer from 'react-native-drawer'
import {
  AppRegistry,
  View,
  StyleSheet,
  ListView,
  RecyclerViewBackedScrollView,
  RefreshControl,
  ActivityIndicator,
  Navigator,
  NavigatorIOS,
  TouchableHighlight,
  WebView,
  AsyncStorage,
  Image,
  ActionSheetIOS,
} from 'react-native'
import {
  Container,
  Header,
  Title,
  List,
  ListItem,
  Content,
  Spinner,
  Thumbnail,
  Text,
  Footer,
  FooterTab,
  Button,
  Icon,
  Badge,
  Tabs,
} from 'native-base'
import VectorIcon from 'react-native-vector-icons/Ionicons'
import Storage from 'react-native-storage'
import { TabViewAnimated, TabBarTop } from 'react-native-tab-view'
import * as WeChat from 'react-native-wechat'

// 配置
console.disableYellowBox = true

// ADBlock.js
const adBlock = '!function(){function a(a,b){if(a&&b)for(var c=a.length-1;c>=0&&b(a[c])!==!1;c--);}function b(a,b){return!!b&&a.substr(0,b.length)===b}function c(a){return window.getComputedStyle(a,null)}function e(a){return!!(b(a,"topAd")||b(a,"top_ad")||b(a,"BAIDU_SSP_")||b(a,"BAIDU_DSPUI"))}function f(a){var b=c(a);if("fixed"!==b.position)return!1;var d=parseInt(b.left,10),e=parseInt(b.right,10),f=parseInt(b.bottom,10);return!isNaN(d)&&d<11||(!isNaN(e)&&e<11||!isNaN(f)&&f<11)}function g(a){var b=a.parentNode||a.parentElement;b&&b.removeChild(a)}function h(){var b=document.getElementsByTagName("div");a(b,function(a){a.id&&e(a.id)&&g(a)})}function j(){for(var b=0;b<i.length;b++){var c=document.getElementsByClassName(i[b]);a(c,g)}}function k(){var b=document.getElementsByTagName("ins");a(b,function(a){f(a)&&g(a)})}window.__ADBLOCK_LOADED=!0;var i=["adsbygoogle","J_adv","left-ad","adpx250","lxb-container","header","mobile_header","section_top","footer","mobile_footer"];h(),j(),k(),$("#essay-body").css("margin-top",0)}();'


// 存储
var storage = new Storage({
  size: 10000,
  storageBackend: AsyncStorage,
  defaultExpires: null,
  enableCache: true,
})

// 调试日志
function logger(...params) {
  if (__DEV__) {
    console.log(...params)
  }
}

// API请求
function fetch_list_with_start(tag='', start=0) {
  let uri = `http://chuansong.me/?start=${start}`
  if (tag != '') {
    uri = `http://chuansong.me/${tag}/?start=${start}`
  }

  return fetch(uri).then((response) => {
      if (response.status === 200) {
        const doc = new DOMParser().parseFromString(response['_bodyInit'],'text/html')
        const h2s = doc.getElementsByClassName('pagedlist_item')
        let items = []
        for (let i=0; i<h2s.length; i++) {
          const account_url = h2s[i].getElementsByClassName('topic_name')[0].getAttribute('href')
          const avatar = h2s[i].getElementsByClassName('profile_photo_img')[0].getAttribute('src')
          const username = h2s[i].getElementsByClassName('name_text')[0].textContent.trim()
          const title = h2s[i].getElementsByClassName('question_link')[0].textContent.trim()
          const created_at = h2s[i].getElementsByClassName('timestamp')[0].textContent.trim()
          const link = h2s[i].getElementsByClassName('question_link')[0].getAttribute('href')

          items.push({
            account_url: account_url,
            username: username,
            avatar: avatar,
            title: title,
            created_at: created_at,
            uri: `http://chuansong.me${link}`,
          })
        }
        return items
      }
      return []
    }).catch(error => {
      logger(`***fetch_list_with_start: ${error}***`)
      // FIX: ALERT
      return []
    })
}

function fetch_list_with_account(account, status, start=0) {
  let uri = `http://chuansong.me${account}?start=${start}`;
  if (status === 'hot') {
    uri = `http://chuansong.me${account}/hot`
  }

  let resp = {items: []}

  // 需要改userAgent
  return fetch(uri).then((response) => {
      if (response.status === 200) {
        const doc = new DOMParser().parseFromString(response['_bodyInit'],'text/html')
        const h2s = doc.getElementsByClassName('pagedlist_item')
        let items = []
        for (let i=0; i<h2s.length; i++) {
          const title = h2s[i].getElementsByClassName('question_link')[0].textContent.trim()
          const created_at = h2s[i].getElementsByClassName('timestamp')[0].textContent.trim()
          const link = h2s[i].getElementsByClassName('question_link')[0].getAttribute('href')
          items.push({
            title: title,
            uri: `http://chuansong.me${link}`,
            created_at: created_at,
          })
        }
        logger('**fetch_list_with_account items**', items)
        // 获取其他信息 暂时拿不到
        const username = '' // doc.getElementsByClassName('topic_name_editor')[0].textContent.trim()
        const wechat_id = '' // doc.getElementsByClassName('section_top')[0].textContent.trim()
        const wechat_name = '' // wechat_id.startsWith('微信ID:') ? wechat_id.replace('微信ID:', '') : wechat_id
        const intro_info = '' // doc.getElementsByClassName('inline_editor_content')[1].textContent.trim()
        return {
          username: username,
          wechat_name: wechat_name,
          intro_info: intro_info,
          items: items,
        }
      }
      return resp
    }).catch(error => {
      logger(`***fetch_list_with_account: ${error}***`)
      // FIX: ALERT
      return resp
    })
}

// 测试
function t_press(item) {

}

// 展示网页
class HTMLView extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      collected: null,
    }

  }

  componentWillMount() {
    // 获取状态
    storage.load({
      key: 'collectedArticle',
      id: this.props.uri,
    }).then(ret => {
      this.setState({collected: true})
    }).catch(err => {
      this.setState({collected: false})
    })
  }

  render() {
    let toolbarView = null

    if (this.state.collected === false) {
      toolbarView = <Icon name="ios-heart-outline" style={styles.htmlViewToolbar} onPress={() => {
            storage.save({
              key: 'collectedArticle',
              id: this.props.uri,
              rawData: {
                uri: this.props.uri,
                title: this.props.title,
              }
            })
            this.setState({collected: true})
          }} />
    } else if (this.state.collected === true) {
      toolbarView = <Icon name="ios-heart" style={styles.htmlViewToolbar} onPress={() => {
            storage.remove({
              key: 'collectedArticle',
              id: this.props.uri,
            })
            this.setState({collected: false})
          }} />
    } else {
      toolbarView = <Icon name="ios-heart-outline" style={styles.htmlViewToolbar} />
    }

    return (
      <View style={{flex: 1}}>
        <WebView
          source={{uri: this.props.uri}}
          injectedJavaScript={adBlock}
          scalesPageToFit={true}
          style={{flex: 0.93}}
        />
        <View style={{flex: 0.07, borderTopWidth: 2, borderColor: '#0A69FE', justifyContent: 'flex-end', alignItems: 'center', flexDirection: 'row'}}>
          <Icon name="ios-share-outline" style={styles.htmlViewToolbar} onPress={ () =>{
            WeChat.isWXAppInstalled().then((flag) => {
              if (flag) {
                // Fix：换成带图标形式的
                ActionSheetIOS.showActionSheetWithOptions({
                  options: ['微信朋友圈', '微信朋友', '取消'],
                  cancelButtonIndex: 2,
                }, (buttonIndex) => {
                  if (buttonIndex === 0) {
                    WeChat.shareToTimeline({
                      type: 'news',
                      title: this.props.title,
                      webpageUrl: this.props.uri,
                    })
                  } else if (buttonIndex === 1) {
                    WeChat.shareToSession({
                      type: 'news',
                      title: this.props.username,
                      description: this.props.title,
                      webpageUrl: this.props.uri,
                    })
                  }
                })
              } else {
                ActionSheetIOS.showActionSheetWithOptions({
                  options: ['取消'],
                  cancelButtonIndex: 0,
                }, (buttonIndex) => {})
              }
            })

          }} />
          {toolbarView}
        </View>
      </View>
    )
  }

}

// 标签列表页面
class TagsView extends React.Component {

  constructor(props) {
    super(props);

    this.state = {};

    this.tags = [
      {
        name: '精选',
        tag: 'select',
      },
      {
        name: '汽车',
        tag: 'auto',
      },
      {
        name: '创意·科技',
        tag: 'ideatech',
      },
      {
        name: '媒体·达人',
        tag: 'newsmedia',
      },
      {
        name: '娱乐·休闲',
        tag: 'fun',
      },
      {
        name: '生活·旅行',
        tag: 'lifejourney',
      },
      {
        name: '学习·工具',
        tag: 'utility',
      },
      {
        name: '历史·读书',
        tag: 'hisbook',
      },
      {
        name: '金融·理财',
        tag: 'finance',
      },
      {
        name: '美食·菜谱',
        tag: 'food',
      },
      {
        name: '电影·音乐',
        tag: 'moviemusic',
      },
    ]
  }

  renderRow(rowData: Map, sectionID: number, rowID: number) {
    return (
      <ListItem button onPress={() => {
        this.props.navigator.push({
          component: TagListView,
          backButtonTitle: '返回',
          leftButtonTitle: '',
          leftButtonIcon: null,
          passProps: {
            tag: rowData.tag,
            title: rowData.title,
          }
        })
      }}>
        <Text style={styles.tagText}>{rowData.name}</Text>
      </ListItem>
    )
  }

  render() {
    return (
      <View style={styles.container}>
        <List
          dataArray={this.tags}
          renderRow={this.renderRow.bind(this)}
        />
      </View>
    )
  }

}

// 收藏公众号页面 (分开写，还是在里面做类型判断写呢。。。
class AccountCollectedView extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      items: [],
    };
  }

  componentWillMount() {
    // 本地存储
    storage.getAllDataForKey('collectedAccount').then(items => {
      this.setState({
        items: items.reverse(),
        isLoading: false,
      })
    }).catch(err => {
      this.setState({
        items: [],
        isLoading: false,
      })
    })
  }

  renderRow(rowData: Map, sectionID: number, rowID: number) {
    return (
      <ListItem button onPress={() => {
        this.props.navigator.push({
          component: AccountView,
          title: rowData.title,
          backButtonTitle: '返回',
          leftButtonTitle: '',
          leftButtonIcon: null,
          rightButtonTitle: '取消收藏',
          onRightButtonPress: () => {
            storage.remove({
              key: 'collectedAccount',
              id: rowData.uri,
            })
          },
          passProps: {
            navigator: this.props.navigator,
            account_url: rowData.uri,
            username: rowData.title,
          }
        })
      }}>
        <Text style={[styles.listText, {textAlign: 'center'}]}>{rowData.title}</Text>
      </ListItem>
    )
  }

  render() {
    return (
      <View style={styles.container}>
        <List
          dataArray={this.state.items}
          renderRow={this.renderRow.bind(this)}
          renderScrollComponent={props => <RecyclerViewBackedScrollView {...props} />}
          renderSeparator={(sectionID, rowID) => <View key={`${sectionID}-${rowID}`} style={styles.separator} />}
          enableEmptySections={true}
        />
      </View>
    )
  }

}


// 收藏文章页面
class ArticleCollectedView extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      items: [],
    }
    console.log('**bili')
  }

  componentWillMount() {
    // 本地存储
    storage.getAllDataForKey('collectedArticle').then(items => {
      this.setState({
        items: items.reverse(),
        isLoading: false,
      })
    }).catch(err => {
      this.setState({
        items: [],
        isLoading: false,
        isRefreshing: false,
      })
    })
  }

  renderRow(rowData: Map, sectionID: number, rowID: number) {
    return (
      <ListItem button onPress={() => {
        this.props.navigator.push({
          component: HTMLView,
          title: this.props.username,
          backButtonTitle: '返回',
          leftButtonTitle: '',
          leftButtonIcon: null,
          passProps: {
            username: this.props.username,
            uri: rowData.uri,
            title: rowData.title,
          }
        })
      }}>
        <Text style={styles.listText}>{rowData.title}</Text>
      </ListItem>
    )
  }

  render() {
    return (
      <View style={styles.container}>
        <List
          dataArray={this.state.items}
          renderRow={this.renderRow.bind(this)}
          renderScrollComponent={props => <RecyclerViewBackedScrollView {...props} />}
          renderSeparator={(sectionID, rowID) => <View key={`${sectionID}-${rowID}`} style={styles.separator} />}
          enableEmptySections={true}
        />
      </View>
    )
  }

}

// 收藏页面
class CollectedView extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      index: 0,
      routes: [
        { key: '1', title: '公众号' },
        { key: '2', title: '文章' },
      ],
    }

    console.log('**acfun**')
  }

  _handleChangeTab(index) {
    this.setState({ index })
  }

  _renderHeader(props) {
    return <TabBarTop {...props} />
  }

  _renderScene(route) {
    // console.log('***route***', route)
    switch (route.route.key) {
    case '1':
      return <AccountCollectedView tabLabel="公众号" navigator={this.props.navigator} />
    case '2':
      console.log('**ki**')
      return <ArticleCollectedView tabLabel="文章" navigator={this.props.navigator} />
    default:
      return null
    }
  }

  render() {
    return (
      <TabViewAnimated
        style={{flex: 1, marginTop: 64}}
        navigationState={this.state}
        renderScene={this._renderScene.bind(this)}
        renderHeader={this._renderHeader.bind(this)}
        onRequestChangeTab={this._handleChangeTab.bind(this)}
      />
    )
  }
}


// 用户消息列表（只有下拉刷新）
class AccountMessageView extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isEndReached: false,
      isBottomReached: false,
      isLoading: true,
      items: [],
      currentStart: 0,
    };
  }

  componentWillMount() {
    fetch_list_with_account(this.props.account_url, 'new', this.state.currentStart).then(result => {
      const items = result.items
      this.setState({
        items: items,
        isLoading: false,
        isEndReached: items.length == 0 ? true: false,
        currentStart: this.state.currentStart + items.length,
      })
    })
  }

  _onEndReached() {
    // FIX: 触到底部不刷新（还是速度太慢）这个太恶心了 要改
    logger('**reached end**', this.state.currentStart)

    if (this.state.isEndReached) {
      return;
    }
    if (this.state.isLoading) {
      return;
    }
    if (this.state.isBottomReached) {
      return;
    }

    this.setState({isLoading: true});

    fetch_list_with_account(this.props.account_url, this.props.status, this.state.currentStart).then(result => {
      const items = result.items
      let tmps = this.state.items.slice()
      tmps.push.apply(tmps, items)
      this.setState({
        items: tmps,
        isLoading: false,
        isRefreshing: false,
        isEndReached: tmps.length === 0 ? true: false,
        currentStart: this.state.currentStart + tmps.length,
      })
    })
  }

  renderRow(rowData: Map, sectionID: number, rowID: number) {
    return (
      <ListItem button onPress={() => {
        this.props.navigator.push({
          component: HTMLView,
          title: this.props.username,
          backButtonTitle: '返回',
          leftButtonTitle: '',
          leftButtonIcon: null,
          passProps: {
            username: this.props.username,
            uri: rowData.uri,
            title: rowData.title,
          }
        })
      }}>
        <Text style={styles.listText}>{rowData.title}</Text>
      </ListItem>
    )
  }

  renderFooter() {
    let loadingView = null
    if (this.state.isLoading) {
      loadingView =
        <View style={styles.loadingView}>
          <ActivityIndicator
            size='small'
            animating={true}
            style={{padding: 5}}
          />
          <Text style={styles.loadingText}>
            加载...
          </Text>
        </View>
    }
    return loadingView
  }

  render() {
    return (
      <View style={styles.container}>
        <List
          dataArray={this.state.items}
          renderRow={this.renderRow.bind(this)}
          renderScrollComponent={props => <RecyclerViewBackedScrollView {...props} />}
          renderSeparator={(sectionID, rowID) => <View key={`${sectionID}-${rowID}`} style={styles.separator} />}
          onEndReached={this._onEndReached.bind(this)}
          onEndReachedThreshold={0}
          enableEmptySections={true}
          renderFooter={this.renderFooter.bind(this)}
        />
      </View>
    )
  }

}

class TabMessages extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      items: [],
      isLoading: true,
    };
  }

  componentWillMount() {
    fetch_list_with_account(this.props.account_url, this.props.status).then((result) => {
      this.setState({
        items: result.items,
        isLoading: false,
      })
    })
  }



  render() {
    let dv = null
    if (this.state.isLoading) {
      dv = <Spinner color='rgb(153, 153, 153)' />
    } else {
      dv = <View><List
          dataArray={this.state.items}
          renderFooter={() => {
             return (
              <Button small style={{marginTop: 5, marginBottom: 5, width: 200, alignSelf: 'center'}} onPress={() => {
                // 跳转到列表页
                this.props.navigator.push({
                  component: AccountMessageView,
                  title: this.props.username,
                  backButtonTitle: '返回',
                  leftButtonTitle: '',
                  leftButtonIcon: null,
                  passProps: {
                    account_url: this.props.account_url,
                    status: this.props.status,
                  }
                })
              }}>点击查看更多</Button>
            )
          }}
          renderRow={(item) =>
            <ListItem button onPress={() => {
              this.props.navigator.push({
                component: HTMLView,
                title: item.title,
                backButtonTitle: '返回',
                leftButtonTitle: '',
                leftButtonIcon: null,
                passProps: {
                  username: this.props.username,
                  uri: item.uri,
                  title: item.title,
                },
              })
            }}>
              <Text style={styles.listText}>{item.title}</Text>
            </ListItem>
          }
        >
        </List>

        </View>
    }
    return (
      <View style={{flex: 1}}>
        {dv}
      </View>
    )
  }

}


class AccountView extends React.Component {
  state = {
    index: 0,
    routes: [
      { key: '1', title: '最新' },
      { key: '2', title: '热门' },
    ],
  };

  _handleChangeTab = (index) => {
    this.setState({ index });
  };

  _renderHeader = (props) => {
    return <TabBarTop {...props} />;
  };

  _renderScene = ({ route }) => {
    switch (route.key) {
    case '1':
      return <TabMessages tabLabel="最新" status="new" account_url={this.props.account_url} navigator={this.props.navigator} username={this.props.username} />;
    case '2':
      return <TabMessages tabLabel="热门" status="hot" account_url={this.props.account_url} navigator={this.props.navigator} username={this.props.username} />;
    default:
      return null;
    }
  };

  render() {
    return (
      <TabViewAnimated
        style={{flex: true, marginTop: 64}}
        navigationState={this.state}
        renderScene={this._renderScene}
        renderHeader={this._renderHeader}
        onRequestChangeTab={this._handleChangeTab}
      />
    );
  }
}

// 首页（＾∀＾）ゞ哈哈
class TagListView extends React.Component {
  constructor(props) {
    super(props);

    let ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    const items = [];
    this.state = {
      isRefreshing: false,
      isEndReached: false,
      isBottomReached: false,
      isLoading: true,
      items: items,
      currentStart: 0,

      //
      isCollected: false,
    };
  }

  componentWillMount() {
    // FIX: 空列表
    fetch_list_with_start(this.props.tag, this.state.currentStart).then(items => {
      this.setState({
        items: items,
        isLoading: false,
        isEndReached: items.length == 0 ? true: false,
        currentStart: this.state.currentStart + items.length,
      })
    })
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.newMessage === this.props.newMessage) {
      return;
    }

    let items = this.state.items.slice();
    items.unshift(nextProps.newMessage);

    this.setState({
      items: items,
    });
  }

  _onRefresh() {
    // 下拉刷新
    this.setState({
      isRefreshing: true,
      currentStart: 0,
    });

    fetch_list_with_start(this.props.tag).then(items => {
      this.setState({
        items: items,
        isLoading: false,
        isEndReached: items.length === 0 ? true: false,
        isRefreshing: false,
        currentStart: this.state.currentStart + items.length,
      })
    })
  }

  _onEndReached() {
    // FIX: 触到底部不刷新（还是速度太慢）这个太恶心了 要改
    logger('**reached end**', this.state.currentStart)

    if (this.state.isEndReached) {
      return;
    }
    if (this.state.isLoading) {
      return;
    }
    if (this.state.isBottomReached) {
      return;
    }

    this.setState({isLoading: true});

    fetch_list_with_start(this.props.tag, this.state.currentStart).then(items => {
      let tmps = this.state.items.slice()
      tmps.push.apply(tmps, items)
      this.setState({
        items: tmps,
        isLoading: false,
        isRefreshing: false,
        isEndReached: tmps.length === 0 ? true: false,
        currentStart: this.state.currentStart + tmps.length,
      })
    })
  }

  render() {
    if (this.state.items.length === 0 && this.state.isLoading === false) {
      return (
        <View style={[styles.container, {alignItems: 'center', justifyContent: 'center'}]}>
          <Button small style={{width: 200, alignSelf: 'center', }} onPress={() => {
            // 首次还没授权加载的时候， 有ui偏移的bug，点击然后禁用才对
            this._onRefresh()
          }}>点击刷新页面</Button>
        </View>
      )
    }
    return (
      <View style={styles.container}>
        <List
          dataArray={this.state.items}
          renderRow={this.renderRow.bind(this)}
          renderScrollComponent={props => <RecyclerViewBackedScrollView {...props} />}
          renderSeparator={(sectionID, rowID) => <View key={`${sectionID}-${rowID}`} style={styles.separator} />}
          onEndReached={this._onEndReached.bind(this)}
          onEndReachedThreshold={100}
          pageSize={20}
          initialListSize={20}
          enableEmptySections={true}
          renderFooter={this.renderFooter.bind(this)}
          refreshControl={
              <RefreshControl
                refreshing={this.state.isRefreshing}
                onRefresh={this._onRefresh.bind(this)}
                tintColor={textColor}
                title="加载..."
                titleColor={textColor}
                colors={[textColor]}
                progressBackgroundColor={textColor}
              />
            }
        />
      </View>
    )
  }

  renderRow(rowData: Map, sectionID: number, rowID: number) {
    return (
      <ListItem button onPress={() => {
        this.props.navigator.push({
          component: HTMLView,
          title: rowData.title,
          backButtonTitle: '返回',
          leftButtonTitle: '',
          leftButtonIcon: null,
          passProps: {
            username: rowData.username,
            uri: rowData.uri,
            title: rowData.title,
          }
        })
      }}>
        <Thumbnail square size={50} source={{uri: rowData.avatar}} />
        <View style={{flexDirection: 'row'}}>
          <Button rounded small info style={{height: 20}} onPress={() => {
            // Fix：检查是否收藏， navigator没法使用setState更新
            storage.load({
              key: 'collectedAccount',
              id: rowData.account_url,
            }).then(ret => {
              this.props.navigator.push({
                component: AccountView,
                title: rowData.username,
                backButtonTitle: '返回',
                leftButtonTitle: '',
                leftButtonIcon: null,
                rightButtonTitle: '取消收藏',
                onRightButtonPress: () => {
                  storage.remove({
                    key: 'collectedAccount',
                    id: rowData.account_url,
                  })
                },
                passProps: {
                  navigator: this.props.navigator,
                  account_url: rowData.account_url,
                  username: rowData.username,
                }
              })
            }).catch(err => {
              this.props.navigator.push({
                component: AccountView,
                title: rowData.username,
                backButtonTitle: '返回',
                leftButtonTitle: '',
                leftButtonIcon: null,
                rightButtonTitle: '收藏',
                onRightButtonPress: () => {
                  storage.save({
                    key: 'collectedAccount',
                    id: rowData.account_url,
                    rawData: {
                      uri: rowData.account_url,
                      title: rowData.username,
                    },
                  })
                },
                passProps: {
                  navigator: this.props.navigator,
                  account_url: rowData.account_url,
                  username: rowData.username,
                }
              })
            })

          }}>{rowData.username}</Button>
          <Text style={{fontSize: 8}}> • {rowData.created_at}</Text>
        </View>
        <Text note>{rowData.title}</Text>
      </ListItem>
    )
  }

  renderFooter() {
    let loadingView = null;
    if (this.state.isLoading) {
      loadingView =
        <View style={styles.loadingView}>
          <ActivityIndicator
            size='small'
            animating={true}
            style={{padding: 5}}
          />
          <Text style={styles.loadingText}>
            加载...
          </Text>
        </View>;
    }
    return loadingView;
  }
}


class ControlPanel extends React.Component {

  render() {
    // FIX：设置，好卡卡
    return (
      <View style={styles.panelContainer}>
        <View style={{alignSelf: 'center', marginTop: 60}}>
          <Image source={require('../imgs/csm.png')} />
        </View>
        <List style={{marginTop: 10}}>
          <ListItem iconLeft onPress={() => {
            let nav = this.props.getNavigator()
            this.props.closeControlPanel()
            nav.push({
              component: TagsView,
              backButtonTitle: '返回',
              leftButtonTitle: '',
              leftButtonIcon: null,
            })
          }}>
            <Icon name="md-pricetag" style={styles.panelIcon} />
            <Text style={styles.panelText}>主题分类</Text>
          </ListItem>
          <ListItem iconLeft onPress={() => {
            let nav = this.props.getNavigator()
            this.props.closeControlPanel()
            nav.push({
              component: CollectedView,
              backButtonTitle: '返回',
              leftButtonTitle: '',
              leftButtonIcon: null,
            })
          }}>
            <Icon name="md-heart" style={styles.panelIcon} />
            <Text style={styles.panelText}>收藏</Text>
          </ListItem>
          {/*<ListItem iconLeft>
            <Icon name="md-settings" style={styles.panelIcon} />
            <Text style={styles.panelText}>设置</Text>
          </ListItem>*/}
        </List>
      </View>
    )
  }

}

export default class csm extends React.Component {

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    // Fix：隐藏
    WeChat.registerApp('wx34b38848ff3e63e8')
  }

  getNavigator(){
    return this.refs.nav
  }

  closeControlPanel() {
    this._drawer.close()
  }

  openControlPanel() {
    this._drawer.open()
  }

  render() {
    return (
      <Drawer
        open={false}
        tapToClose={true}
        panCloseMask={0.2}
        acceptTap={true}
        useInteractionManager={true}
        ref={(ref) => this._drawer = ref}
        type='static'
        openDrawerOffset={100}
        tweenHandler={Drawer.tweenPresets.parallax}
        styles={{drawer: { shadowColor: '#000000', shadowOpacity: 0.8, shadowRadius: 3}}}
        content={<ControlPanel
          getNavigator={this.getNavigator.bind(this)}
          closeControlPanel={this.closeControlPanel.bind(this)}
        />}
      >
        <NavigatorIOS
          ref='nav'
          initialRoute={{
            component: TagListView,
            title: '首页',
            passProps: {
              tag: '',
            }
          }}
          leftButtonTitle='菜单'
          leftButtonIcon={require('../imgs/Line.png')}
          onLeftButtonPress={() => {
            this.openControlPanel()
          }}
          style={{flex: 1}}
        />
      </Drawer>

    );
  }
}

// 常用字体颜色
const backgroundColor = '#EDEDED'
const textColor = 'rgb(153, 153, 153)'
const textFontSize = 14


const styles = StyleSheet.create({
  // 大容器
  container: {
    flex: 1,
    backgroundColor: backgroundColor,
  },
  // 菜单导航
  panelContainer: {
    flex: 1,
    backgroundColor: 'rgb(171, 25, 66)'
  },
  panelIcon: {
    color: '#FFF',
    fontSize: 18,
  },
  panelText: {
    fontSize: 14,
    color: '#FFF',
  },
  // 浏览器
  htmlViewToolbar: {
    color: '#0A69FE',
    marginRight: 20
  },
  // 列表页面
  separator: {
    height: 2,
    backgroundColor: backgroundColor,
  },
  loadingView: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  loadingText: {
    fontSize: textFontSize,
    color: textColor,
  },
  listText: {
    fontSize: textFontSize,
    color: textColor,
  },
  tagText: {
    fontSize: textFontSize,
    color: textColor,
    textAlign: 'center',
  },
});

AppRegistry.registerComponent('csm', () => csm);
