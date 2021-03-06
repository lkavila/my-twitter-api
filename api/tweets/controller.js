const Tweet = require("./model");
const { findUserByUsername } = require("../services/userService");
const { locale } = require("../../locale");
const { getTweetsByUsername } = require("../services/twitterService");

const list = (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  Tweet.find({}, ["content", "comments", "likes", "user", "createdAt"])
    .populate("user", ["name", "username"])
    .populate("comments.user", ["name", "username"])
    .limit(Number(limit))
    .skip(skip)
    .sort({ createdAt: -1 })
    .then(async (tweets) => {
      const total = await Tweet.estimatedDocumentCount();
      const totalPages = Math.round(total / limit);
      const hasMore = page < totalPages;

      res.status(200).json({
        hasMore,
        totalPages,
        total,
        data: tweets,
        currentPage: page,
      });
    });
};

const getAllUserInfo = async (req, res) => {
  const {username} = req.params
  const {page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const user = await findUserByUsername(username)

  if(!user){
    return res.status(404).json({
      message: `${locale.translate("errors.user.userNotExists")}`
    });
  }

  Tweet.find({"user": user._id}, ["content", "comments", "likes", "user", "createdAt"])
    .populate("comments.user", ["name", "username"])
    .limit(Number(limit))
    .skip(skip)
    .sort({ createdAt: -1 })
    .then((tweets) => {
        const total = tweets.length
        const totalPages = Math.round(total / limit);
        const hasMore = page < totalPages;

      res.status(200).json({

        user: {email: user.email, name: user.name, username: user.username, createdAt: user.createdAt},
        userTweets: {
          tweets,
          hasMore,
          totalPages,
          total,
          currentPage: page,
        }
      });
    });
};

const listUserTweets = (req, res) => {
  const {id, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  Tweet.find({"user": id}, ["content", "comments", "likes", "user", "createdAt"])
      .populate("user", ["name", "username"])
      .populate("comments.user", ["name", "username"])
      .limit(Number(limit))
      .skip(skip)
      .sort({ createdAt: -1 })
      .then((tweets) => {
        const total = tweets.length
        const totalPages = Math.round(total / limit);
        const hasMore = page < totalPages;

      res.status(200).json({
        hasMore,
        totalPages,
        total,
        data: tweets,
        currentPage: page,
      });
    });
};



const getOne = (req, res) => {
  Tweet.findOne({ "_id": req.params.id }, ["content", "comments", "likes", "user", "createdAt"])
    .populate("user", ["name", "username"])
    .populate("comments.user", ["name", "username"])
    .then((tweet) => {
      res.status(200).json({
        tweet: tweet,
      });
    })
    .catch(() => {
      res.status(404).json({
        tweet: "Tweet not found"
      })
    });
};

const create = (req, res) => {
  const { content, userId } = req.body;

  const tweet = {
    content,
    user: userId,
  };

  const newTweet = new Tweet(tweet);
  newTweet.save().then((tweetCreated) => {
    res.status(200).json(tweetCreated);
  });
};

const createComment = (req, res) => {
  const { comment, tweetId, userId } = req.body;

  const comments = {
    comment,
    user: userId,
  };

  Tweet.updateOne({ _id: tweetId }, { $addToSet: { comments } })
    .then(() => {
      res.status(200).json({ message: "ok", ...comments });
    })
    .catch((error) => {
      res.status(500).json({ message: "not updated" });
    });
};

const likes = (req, res) => {
  const { like, tweetId } = req.body;

  Tweet.updateOne({ _id: tweetId }, { $inc: { likes: 1 } })
    .then(() => {
      res.status(200).json({ message: "ok" });
    })
    .catch((error) => {
      res.status(500).json({ message: "not updated" });
    });
};

const destroyTweet = async (req, res) => {
  const { tweetId, userId } = req.body;

  await Tweet.findOneAndDelete(
    {
      $and: [{ _id: { $eq: tweetId } }, { user: { $eq: userId } }],
    },
    (err, docs) => {
      if (err) {
        res.status(500).json({
          message: `${locale.translate("errors.tweet.onDelete")}`,
        });
      } else if (docs) {
        res.status(200).json({
          message: `${locale.translate("success.tweet.onDelete")}`,
          id: docs._id,
        });
      } else {
        res.status(404).json({
          message: `${locale.translate("errors.tweet.tweetNotExists")}`,
        });
      }
    }
  );
};

const getExternalTweetsByUsername = async (req, res) => {
  const { username } = req.params;
  const tweetsResponse = await getTweetsByUsername(username);
  const tweets = tweetsResponse.map(({ text, created_at }) => {
    return {
      text,
      created_at,
    };
  });
  res.status(200).json(tweets);
};

module.exports = {
  list,
  getOne,
  listUserTweets,
  create,
  createComment,
  likes,
  destroyTweet,
  getAllUserInfo,
  getExternalTweetsByUsername,
};
