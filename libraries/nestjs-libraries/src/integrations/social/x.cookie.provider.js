"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XCookieProvider = void 0;
const social_abstract_1 = require("../social.abstract");
const crypto_1 = require("crypto");
const strip_html_validation_1 = require("../../../../helpers/src/utils/strip.html.validation");

const X_WEB_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const CREATE_TWEET_QUERY_ID = 'lvs5-tN_lLNg_PhdRSURMg';

const CREATE_TWEET_FEATURES = {
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  content_disclosure_indicator_enabled: true,
  content_disclosure_ai_generated_indicator_enabled: true,
  responsive_web_grok_show_grok_translated_post: false,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: false,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: true,
  articles_preview_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: false,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

class XCookieProvider extends social_abstract_1.SocialAbstract {
  constructor() {
    super(...arguments);
    this.identifier = 'x-cookie';
    this.name = 'X (Cookie)';
    this.isBetweenSteps = false;
    this.scopes = [];
    this.editor = 'normal';
    this.toolTip =
      'Post to X for free using browser session cookies — no API key required. Cookies expire ~30 days.';
  }

  maxLength() {
    return 280;
  }

  async customFields() {
    return [
      {
        key: 'auth_token',
        label: 'auth_token',
        validation: `/^.{20,}$/`,
        type: 'password',
      },
      {
        key: 'ct0',
        label: 'ct0',
        validation: `/^.{40,}$/`,
        type: 'password',
      },
    ];
  }

  async generateAuthUrl() {
    const state = (0, crypto_1.randomUUID)();
    return { url: state, codeVerifier: state, state };
  }

  async refreshToken() {
    return { id: '', name: '', accessToken: '', refreshToken: '', expiresIn: 0, picture: '', username: '' };
  }

  async authenticate(params) {
    const { auth_token, ct0 } = JSON.parse(
      Buffer.from(params.code, 'base64').toString()
    );
    try {
      const response = await fetch(
        'https://x.com/i/api/1.1/account/verify_credentials.json',
        { headers: this.buildHeaders(auth_token, ct0) }
      );
      if (!response.ok) {
        const body = await response.text();
        console.error('[XCookie] verify_credentials failed:', response.status, body);
        return 'Invalid cookies. Please check your auth_token and ct0 values and try again.';
      }
      const data = await response.json();
      if (data.errors) {
        return 'Invalid cookies. X returned an error: ' + data.errors[0]?.message;
      }
      const picture = (data.profile_image_url_https || '').replace('_normal', '');
      return {
        id: String(data.id_str || data.id),
        name: data.name,
        accessToken: `${auth_token}:${ct0}`,
        refreshToken: '',
        expiresIn: 999999999,
        picture,
        username: data.screen_name,
        additionalSettings: [],
      };
    } catch (err) {
      console.error('[XCookie] authenticate error:', err);
      return 'Failed to verify credentials. Please try again.';
    }
  }

  buildHeaders(auth_token, ct0) {
    return {
      authorization: `Bearer ${X_WEB_BEARER}`,
      cookie: `auth_token=${auth_token}; ct0=${ct0}`,
      'x-csrf-token': ct0,
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
      'content-type': 'application/json',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      origin: 'https://x.com',
      referer: 'https://x.com/home',
      'accept-language': 'en-US,en;q=0.9',
    };
  }

  async post(id, accessToken, postDetails) {
    const colonIndex = accessToken.indexOf(':');
    const auth_token = accessToken.substring(0, colonIndex);
    const ct0 = accessToken.substring(colonIndex + 1);
    const [firstPost] = postDetails;
    const tweetText = (0, strip_html_validation_1.stripHtmlValidation)('normal', firstPost.message, true);
    const body = {
      variables: {
        tweet_text: tweetText,
        media: { media_entities: [], possibly_sensitive: false },
        semantic_annotation_ids: [],
        disallowed_reply_options: null,
      },
      features: CREATE_TWEET_FEATURES,
      queryId: CREATE_TWEET_QUERY_ID,
    };
    const response = await fetch(
      `https://x.com/i/api/graphql/${CREATE_TWEET_QUERY_ID}/CreateTweet`,
      { method: 'POST', headers: this.buildHeaders(auth_token, ct0), body: JSON.stringify(body) }
    );
    const data = await response.json();
    if (!response.ok || data.errors) {
      const errMsg = data.errors?.[0]?.message || `X API error ${response.status}`;
      throw new Error(errMsg);
    }
    const result = data?.data?.create_tweet?.tweet_results?.result;
    const tweetId = result?.rest_id;
    const username =
      result?.core?.user_results?.result?.legacy?.screen_name ||
      result?.core?.user_results?.result?.core?.screen_name;
    return [{ postId: tweetId || '', id: firstPost.id, releaseURL: tweetId ? `https://x.com/${username}/status/${tweetId}` : '', status: 'posted' }];
  }

  async analytics() {
    return [];
  }
}

exports.XCookieProvider = XCookieProvider;
