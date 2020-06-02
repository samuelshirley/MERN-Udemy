const express = require('express');
const router = express.Router();
const User = require('../../models/Users');
const Profile = require('../../models/Profiles');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

//@route    GET api/profiles/me
//@desc     Gets a current users profile
//@access   Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id,
    }).populate('user', ['name, avatar']);

    if (!profile) {
      res.status(400).json({ msg: 'No profile found for this user' });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route    POST api/profiles
//@desc     Create or update a current users profile
//@access   Private
router.post(
  '/',
  [
    auth,
    check('status', 'Status is required').not().isEmpty(),
    check('skills', 'Skills is required').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      company,
      website,
      location,
      status,
      bio,
      githubusername,
      skills,
      youtube,
      instagram,
      linkedin,
      facebook,
    } = req.body;

    //Build pofile obeject
    const profileFields = {};
    profileFields.user = req.user.id;
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (status) profileFields.status = status;
    if (skills) {
      profileFields.skills = skills.split(',').map((skills) => skills.trim());
    }
    if (bio) profileFields.bio = bio;
    if (githubusername) profileFields.githubusername = githubusername;

    // Build social object
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (instagram) profileFields.social.instagram = instagram;
    if (linkedin) profileFields.social.linkedin = linkedin;
    if (facebook) profileFields.social.facebook = facebook;

    //Update a current profile
    try {
      let profile = await Profile.findOne({ user: req.user.id });

      if (profile) {
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );

        return res.json(profile);
      }
      //Create a profile

      profile = new Profile(profileFields);
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

//@route    GET api/profiles
//@desc     Gets all profiles
//@access   Public
router.get('/', async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
  }

  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    res.send(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route    GET api/profiles/user/:user_id
//@desc     Gets profiles by user id
//@access   Public
router.get('/user/:user_id', async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
  }

  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate('user', ['name', 'avatar']);

    if (!profile) {
      return res.status(400).json({ msg: 'Profile not found.' });
    }
    res.send(profile);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    res.status(500).send('Server Error');
  }
});

//@route     DELETE /profiles
//@desc      Deletes a User and Profile via associated to auth token
//@access    Private
router.delete('/', auth, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
  }

  try {
    let profile = await Profile.findOneAndDelete({ user: req.user.id });
    await User.findOneAndDelete({ _id: req.user.id });
    if (!profile) {
      return res.status(400).json({ msg: 'No profile found' });
    }

    res.send('User and profile were deleted');
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route     PUT /profiles/experience
//@desc      Updates a users experience to the users profile
//@access    Private
router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'A title is required').not().isEmpty(),
      check('company', 'A company is required').not().isEmpty(),
      check('from', 'From date is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
    }

    const { title, company, from, to, current, description } = req.body;

    const newExp = {
      title,
      company,
      from,
      to,
      current,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.experience.unshift(newExp);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  }
);

//@route     DELETE /profiles/experience
//@desc      Delete a users experience on their profile
//@access    Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
  }

  try {
    let profile = await Profile.findOne({ user: req.user.id });

    const removeIndex = profile.experience
      .map((item) => item.id)
      .indexOf(req.params.exp_id);

    profile.experience.splice(removeIndex, 1);

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

//@route     PUT /profiles/education
//@desc      Add education to a users profile
//@access    Private
router.put(
  '/education',
  [
    auth,
    check('school', 'School is required').not().isEmpty(),
    check('from', 'From date is required').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { school, fieldOfStudy, from, to, current, description } = req.body;

    const newEducation = {
      school,
      fieldOfStudy,
      from,
      to,
      current,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.education.unshift(newEducation);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  }
);

//@route      Delete /profile/education/:ed_id
//@desc       Deletes a users education from thier profile
//access      Private
router.delete('/education/:ed_id', auth, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
  }

  try {
    let profile = await Profile.findOne({ user: req.user.id });

    const removeIndex = profile.education
      .map((item) => item.id)
      .indexOf(req.params.ed_id);

    profile.education.splice(removeIndex, 1);

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;
