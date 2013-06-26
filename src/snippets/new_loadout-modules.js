/* Osmium
 * Copyright (C) 2012, 2013 Romain "Artefact2" Dalmaso <artefact2@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

osmium_gen_modules = function() {
	var p = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']];
	var cpid = osmium_clf['X-Osmium-current-chargepresetid'];
	var m, i, j, type, c, chargeid;

	$('section#modules > div.slots > ul').empty();

	if(!("modules" in p)) p.modules = [];

	for(i = 0; i < p.modules.length; ++i) {
		m = p.modules[i];
		chargeid = null;
		if("charges" in m) {
			for(j = 0; j < m.charges.length; ++j) {
				if(!("cpid" in m.charges[j])) {
					m.charges[j].cpid = 0;
				}

				if(m.charges[j].cpid == cpid) {
					chargeid = m.charges[j].typeid;
					break;
				}
			}
		}

		osmium_add_module(m.typeid, m.index, m.state, chargeid);
	}

	for(type in osmium_clf['X-Osmium-slots']) {
		$('section#modules > div.slots.' + type).data('type', type);
	}

	osmium_update_slotcounts();
};

osmium_init_modules = function() {
	$("section#modules > div.slots > h3 > span > small.groupcharges").on('click', function() {
		var t = $(this);
		var slotsdiv = t.parents("div.slots");

		if(slotsdiv.hasClass('grouped')) {
			slotsdiv.removeClass('grouped').addClass('ungrouped');
			t.text('Charges are not grouped');
		} else {
			slotsdiv.removeClass('ungrouped').addClass('grouped');
			t.text('Charges are grouped');
		}

		t.prop('title', t.text());
	}).each(function() {
		var t = $(this);
		t.prop('title', t.text());
	});

	$("section#modules > div.slots > ul").sortable({
		items: "li:not(.placeholder)",
		placeholder: "sortable-placeholder",
		start: function() {
			$("section#modules > div.slots").css('opacity', 0.5);
			$(this).addClass('sorting').parent().css('opacity', 1.0);
		},
		stop: function() {
			$("section#modules > div.slots").css('opacity', 1.0);
			$(this).removeClass('sorting');
		},
		update: function() {
			var z = 0;
			var mp = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']].modules;
			var map = {};

			$("section#modules > div.slots").find('li').each(function() {
				var t = $(this).data('typeid');
				var i = $(this).data('index');

				if(!t) return;
				if(!(t in map)) map[t] = {};

				map[t][i] = z;
				$(this).data('index', z);
				++z;
			});

			for(var i = 0; i < mp.length; ++i) {
				mp[i].index = map[mp[i].typeid][mp[i].index];
			}

			mp.sort(function(x, y) {
				return x.index - y.index;
			});

			osmium_commit_clf();
			osmium_undo_push();
		}
	});
};

osmium_update_slotcounts = function() {
	$('section#modules > div.slots').each(function() {
		var t = $(this);
		osmium_update_overflow(t);
		osmium_maybe_hide_slot_type(t);
	});
};

osmium_maybe_hide_slot_type = function(slotsdiv) {
	if(slotsdiv.children('ul').find('li').length > 0) {
		slotsdiv.show();
	} else {
		slotsdiv.hide();
	}
};

osmium_update_overflow = function(slotsdiv) {
	var smallcount = slotsdiv.find('h3 > span > small.counts');
	var used = slotsdiv.children('ul').children('li').not('.placeholder').length;
	var total = osmium_clf['X-Osmium-slots'][slotsdiv.data('type')];

	smallcount.text(used + '/' + total);

	var placeholders = slotsdiv.find('li.placeholder').length;
	var ideal = total - used;
	while(placeholders < ideal) {
		osmium_add_placeholder_module(slotsdiv);
		++placeholders;
	}
	while(placeholders > ideal) {
		slotsdiv.find('li.placeholder').last().remove();
		--placeholders;
	}

	if(used > total) {
		smallcount.addClass('overflow');
		slotsdiv.children('ul').children('li').slice(total - used).addClass('overflow');
	} else {
		smallcount.removeClass('overflow');
		slotsdiv.children('ul').children('li.overflow').removeClass('overflow');
	}
};

osmium_add_module = function(typeid, index, state, chargeid) {
	var m = osmium_types[typeid];
	var div = $('section#modules > div.' + m[3]);
	var ul = div.children('ul');
	var placeholders = ul.children('li.placeholder');
	var li, img, a, stateimg;
	var stateful, hascharges;

	if(state === null) {
		if(osmium_module_states[typeid][2]) {
			/* Active state, if possible */
			state = osmium_states[2];
		} else if(osmium_module_states[typeid][1]) {
			/* Online state */
			state = osmium_states[1];
		} else {
			/* Offline state */
			state = osmium_states[0];
		}
	}

	li = $(document.createElement('li'));
	li.data('typeid', typeid);
	li.data('slottype', m[3]);
	li.data('index', index);
	li.data('state', state);
	li.text(m[1]);

	img = $(document.createElement('img'));
	img.prop('src', '//image.eveonline.com/Type/' + typeid + '_64.png');

	li.prepend(img);

	if(hascharges = (typeid in osmium_charges)) {
		li.on('remove_charge_nogroupcheck', function() {
			var span = li.children('span.charge');
			var chargeimg = span.children('img');
			var charge = span.children('span.name');

			li.data('chargetypeid', null);
			chargeimg.prop('src', osmium_relative + '/static-' + osmium_staticver
						   + '/icons/no_charge.png');
			charge.empty();
			charge.append($(document.createElement('em')).text('(No charge)'));

			var modules = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']].modules;
			for(var i = 0; i < modules.length; ++i) {
				if(modules[i].index === index && modules[i].typeid === typeid) {
					/* Removing nonexistent charge */
					if(!("charges" in modules[i])) break;

					var charges = modules[i].charges;
					var curcpid = osmium_clf['X-Osmium-current-chargepresetid'];
					var cpid;
					for(var j = 0; j < charges.length; ++j) {
						if(!("cpid" in charges[j])) {
							cpid = 0; /* The spec says a value of 0 must be assumed */
						} else {
							cpid = charges[j].cpid;
						}

						if(curcpid == cpid) {
							osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
								.modules[i].charges.splice(j, 1);
							break;
						}
					}
					break;
				}
			}
		}).on('remove_charge', function() {
			if(li.parents('div.slots').hasClass('grouped')) {
				li.parents('div.slots').find('li.hascharge').filter(function() {
					var t = $(this);
					return t.data('typeid') === li.data('typeid') 
						&& t.data('chargetypeid') === li.data('chargetypeid');
				}).trigger('remove_charge_nogroupcheck');
			} else {
				li.trigger('remove_charge_nogroupcheck');
			}
		});

		var charge = $(document.createElement('span'));
		charge.addClass('charge');
		charge.text(',').append($(document.createElement('br')));
		charge.append($(document.createElement('img')).prop('alt', ''));
		charge.append($(document.createElement('span')).addClass('name'));

		li.append(charge);
		li.addClass('hascharge');

		if(chargeid === null) {
			li.trigger('remove_charge_nogroupcheck');
		} else {
			osmium_add_charge(li, chargeid);
		}

		charge.on('dblclick', function(e) {
			/* When dblclicking the charge, remove the charge but not the module */
			li.trigger('remove_charge');
			osmium_commit_clf();
			osmium_undo_push();
			e.stopPropagation();
			return false;
		});
	}

	if(stateful = ($.inArray(m[3], osmium_stateful_slot_types) !== -1)) {
		a = $(document.createElement('a'));
		stateimg = $(document.createElement('img'));
		a.addClass('toggle_state');
		a.prop('href', 'javascript:void(0);');
		stateimg.prop('alt', '');
		a.append(stateimg);
		li.append(a);

		li.on('state_changed', function() {
			var a = li.children('a.toggle_state');
			var stateimg = a.children('img');
			var state = li.data('state');

			a.prop('title', osmium_module_state_names[state][0]);
			stateimg.prop('alt', a.prop('title'));
			stateimg.prop('src', osmium_relative + '/static-' + osmium_staticver
						  + '/icons/' + osmium_module_state_names[state][1]);
		}).trigger('state_changed');

		a.on('click', function() {
			var a = $(this);
			var li = a.parent();
			var state = li.data('state');
			var nextstate;

			a.blur();

			if(state === 'offline') {
				nextstate = (osmium_module_states[typeid][1] ? 'online' : 'offline');
			} else if(state === 'online') {
				nextstate = (osmium_module_states[typeid][2] ? 'active' : 'offline');
			} else if(state === 'active') {
				nextstate = (osmium_module_states[typeid][3] ? 'overloaded' : 'offline');
			} else if(state === 'overloaded') {
				nextstate = 'offline';
			}

			osmium_set_module_state(li, nextstate);
			return false;
		}).on('contextmenu', function() {
			var a = $(this);
			var li = a.parent();
			var state = li.data('state');
			var prevstate;

			a.blur();

			if(state === 'offline') {
				if(osmium_module_states[typeid][3]) {
					prevstate = 'overloaded';
				} else if(osmium_module_states[typeid][2]) {
					prevstate = 'active';
				} else if(osmium_module_states[typeid][1]) {
					prevstate = 'online';
				} else {
					prevstate = 'offline';
				}
			} else if(state === 'online') {
				prevstate = 'offline';
			} else if(state === 'active') {
				prevstate = 'online';
			} else if(state === 'overloaded') {
				prevstate = 'active';
			}

			osmium_set_module_state(li, prevstate);
			return false;
		}).on('dblclick', function(e) {
			/* Prevent dblclick fire on the <li> itself */

			e.stopPropagation();
			return false;
		});
	}

	if(placeholders.length > 0) {
		placeholders.first().before(li);
	} else {
		ul.append(li);
	}

	if(osmium_user_initiated) {
		$('a[href="#modules"]').parent().click();
	}

	li.on('remove_module', function() {
		var modules = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']].modules;
		for(var i = 0; i < modules.length; ++i) {
			if(modules[i].index === index && modules[i].typeid === typeid) {
				osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']].modules.splice(i, 1);
				break;
			}
		}

		li.remove();
	});

	osmium_ctxmenu_bind(li, function() {
		var menu = osmium_ctxmenu_create();

		osmium_ctxmenu_add_option(menu, "Unfit module", function() {
			li.trigger('remove_module');
			osmium_commit_clf();
			osmium_undo_push();
		}, { default: true });

		osmium_ctxmenu_add_option(menu, "Unfit all of the same type", function() {
			li.parent().find('li').filter(function() {
				return $(this).data('typeid') === typeid
			}).trigger('remove_module');

			osmium_commit_clf();
			osmium_undo_push();
			osmium_update_slotcounts();
		}, {});

		if(hascharges) {
			osmium_ctxmenu_add_separator(menu);

			osmium_ctxmenu_add_subctxmenu(menu, "Charges", function() {
				var chargemenu = osmium_ctxmenu_create();
				var cgroups = {};
				var ngroups = 0;
				var pgroup = function(menu, group) {
					for(var i = 0; i < group.length; ++i) {
						osmium_ctxmenu_add_option(
							menu,
							osmium_types[group[i]][1],
							(function(chargeid) {
								return function() {
									var modules = osmium_clf.presets[
										osmium_clf['X-Osmium-current-presetid']
									].modules;

									for(var i = 0; i < modules.length; ++i) {
										if(modules[i].typeid === typeid && modules[i].index === index) {
											osmium_auto_add_charge_to_location(i, chargeid);
											osmium_commit_clf();
											osmium_undo_push();
											return;
										}
									}
								};
							})(group[i]),
							{ icon: "//image.eveonline.com/Type/" + group[i] + "_64.png" }
						);
					}
				};

				for(var i = 0; i < osmium_charges[typeid].length; ++i) {
					var t = osmium_types[osmium_charges[typeid][i]];
					if(!(t[4] in cgroups)) {
						cgroups[t[4]] = [];
						++ngroups;
					}
					cgroups[t[4]].push(t[0]);
				}

				if(ngroups === 1) {
					for(var g in cgroups) {
						pgroup(chargemenu, cgroups[g]);
					}
				} else {
					for(var g in cgroups) {
						/* Does not work like you expect it to without
						 * the wrapper "generator function". */
						osmium_ctxmenu_add_subctxmenu(chargemenu, osmium_metagroups[g], (function(group) {
							return function() {
								var submenu = osmium_ctxmenu_create();
								pgroup(submenu, group);
								return submenu;
							};
						})(cgroups[g]), { icon: "//image.eveonline.com/Type/" + cgroups[g][0] + "_64.png" });
					}
				}

				return chargemenu;
			}, { icon: "//image.eveonline.com/Type/" + osmium_charges[typeid][0] + "_64.png" });

			osmium_ctxmenu_add_option(menu, "Remove charge", function() {
				li.trigger('remove_charge');
				osmium_commit_clf();
				osmium_undo_push();
			}, { icon: "no_charge.png" });
		}

		if(stateful) {
			osmium_ctxmenu_add_separator(menu);

			if(osmium_module_states[typeid][0]) {
				osmium_ctxmenu_add_option(menu, "Offline module", function() {
					osmium_set_module_state(li, "offline");
				}, { icon: osmium_module_state_names['offline'][1] });
			}
			if(osmium_module_states[typeid][1]) {
				osmium_ctxmenu_add_option(menu, "Online module", function() {
					osmium_set_module_state(li, "online");
				}, { icon: osmium_module_state_names['online'][1] });
			}
			if(osmium_module_states[typeid][2]) {
				osmium_ctxmenu_add_option(menu, "Activate module", function() {
					osmium_set_module_state(li, "active");
				}, { icon: osmium_module_state_names['active'][1] });
			}
			if(osmium_module_states[typeid][3]) {
				osmium_ctxmenu_add_option(menu, "Toggle overload", function() {
					if(li.data('state') !== "overloaded") {
						osmium_set_module_state(li, "overloaded");
					} else {
						osmium_set_module_state(li, "active");
					}
				}, { icon: osmium_module_state_names['overloaded'][1] });
			}
		}

		osmium_ctxmenu_add_separator(menu);

		osmium_ctxmenu_add_option(menu, "Show module info", function() {
			osmium_showinfo({
				new: osmium_clftoken,
				type: "module",
				slottype: li.data('slottype'),
				index: li.data('index')
			}, "..");
		}, { icon: "showinfo.png" });

		if(hascharges && li.data('chargetypeid') !== null) {
			osmium_ctxmenu_add_option(menu, "Show charge info", function() {
				osmium_showinfo({
					new: osmium_clftoken,
					type: "charge",
					slottype: li.data('slottype'),
					index: li.data('index')
				}, "..");
			}, { icon: "showinfo.png" });
		}

		return menu;
	});

	return div;
};

osmium_add_placeholder_module = function(slotsdiv) {
	var ul = slotsdiv.children('ul');
	var li, img;
	var type = slotsdiv.data('type');

	li = $(document.createElement('li'));
	li.addClass('placeholder');
	li.text('Unused ' + type + ' slot');

	img = $(document.createElement('img'));
	img.prop('src', '../static-' + osmium_staticver + '/icons/slot_' + type + '.png');

	li.prepend(img);
	ul.append(li);
};

osmium_set_module_state = function(li, newstate) {
	var index = li.data('index');
	var typeid = li.data('typeid');

	li.data('state', newstate);

	var modules = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']].modules;
	for(var i = 0; i < modules.length; ++i) {
		if(modules[i].index === index && modules[i].typeid === typeid) {
			osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
				.modules[i].state = newstate;
			break;
		}
	}

	osmium_commit_clf();
	osmium_undo_push();
	li.trigger('state_changed');
};

osmium_add_charge = function(li, chargetypeid) {
	var span = li.children('span.charge');
	var chargeimg = span.children('img');
	var charge = span.children('span.name');

	li.data('chargetypeid', chargetypeid);

	chargeimg.prop('src', '//image.eveonline.com/Type/' + chargetypeid + '_64.png');
	charge.empty();
	charge.text(osmium_types[chargetypeid][1]);
};

osmium_add_charge_by_location = function(locationtypeid, locationindex, chargetypeid) {
	var li = $('section#modules > div.slots li.hascharge').filter(function() {
		var t = $(this);
		return t.data('typeid') === locationtypeid && t.data('index') === locationindex;
	}).first();

	return osmium_add_charge(li, chargetypeid);
};

osmium_get_best_location_for_charge = function(typeid) {
	var location = null;
	var candidatelevel;

	for(var i = 0; i < osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
		.modules.length; ++i) {
		m = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']].modules[i];

		var validcharge = false, currentchargeid = null;
		if(!(m.typeid in osmium_charges)) {
			/* Module can't accept charges */
			continue;
		}
		for(var j = 0; j < osmium_charges[m.typeid].length; ++j) {
			if(osmium_charges[m.typeid][j] === typeid) {
				validcharge = true;
				break;
			}
		}
		if(!validcharge) continue;

		if(location === null) {
			/* As a fallback, fit the charge to the first suitable location */
			location = i;
			candidatelevel = 0; /* This candidate is not very good */
		}

		if(!("charges" in m)) {
			/* The module has no charges and can accept the charge, perfect */
			location = i;
			break;
		}

		var charges = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
			.modules[i].charges;
		var cpid;

		/* Check if charge already present */
		for(var j = 0; j < charges.length; ++j) {
			if("cpid" in charges[j]) {
				cpid = charges[j].cpid;
			} else {
				cpid = 0;
			}

			if(cpid == osmium_clf['X-Osmium-current-chargepresetid']) {
				currentchargeid = charges[j].typeid;
				break;
			}
		}
		if(currentchargeid === null) {
			/* The module has no charge in this preset and can accept the charge */
			location = i;
			break;
		} else if(currentchargeid !== typeid && candidatelevel < 1) {
			/* The module has a different charge, but it's still a
			 * better candidate than the fallback */
			location = i;
			candidatelevel = 1;
		}
	}

	return location;
};

osmium_auto_add_charge_to_location = function(location, typeid) {
	var m = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
		.modules[location];
	var moduletypeid = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
		.modules[location].typeid;
	var moduletype = osmium_types[moduletypeid][3];
	var previouschargeid = null;

	if(!("charges" in m)) {
		osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
			.modules[location].charges = [];
	}

	var charges = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
		.modules[location].charges;
	var cpid;

	/* Remove previous charge (if there is one) */
	for(var j = 0; j < charges.length; ++j) {
		if("cpid" in charges[j]) {
			cpid = charges[j].cpid;
		} else {
			cpid = 0;
		}

		if(cpid !== osmium_clf['X-Osmium-current-chargepresetid']) {
			continue;
		}

		previouschargeid = charges[j].typeid;

		osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
			.modules[location].charges.splice(j, 1);
		break;
	}

	/* Finally, add the new charge */
	osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
		.modules[location].charges.push({
			typeid: typeid,
			cpid: osmium_clf['X-Osmium-current-chargepresetid']
		});

	osmium_add_charge_by_location(m.typeid, m.index, typeid);

	if($("section#modules > div.slots." + moduletype).hasClass('grouped')) {
		/* Also add this charge to identical modules with identical charges */

		var curchargeid;
		var curchargeidx;
		for(var i = 0; i < osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
			.modules.length; ++i) {
			curchargeid = null;
			curchargeidx = 0;

			m = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']].modules[i];
			if(m.typeid !== moduletypeid) {
				continue;
			}

			if(!("charges" in m)) {
				osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
					.modules[i].charges = [];
			}

			charges = osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
				.modules[i].charges;

			for(var j = 0; j < charges.length; ++j) {
				if("cpid" in charges[j]) {
					cpid = charges[j].cpid;
				} else {
					cpid = 0;
				}

				if(cpid !== osmium_clf['X-Osmium-current-chargepresetid']) {
					continue;
				}

				curchargeid = charges[j].typeid;
				curchargeidx = j;
				break;
			}

			if(curchargeid !== previouschargeid) {
				continue;
			}

			osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
				.modules[i].charges.splice(curchargeidx, 1);

			osmium_clf.presets[osmium_clf['X-Osmium-current-presetid']]
				.modules[i].charges.push({
					typeid: typeid,
					cpid: osmium_clf['X-Osmium-current-chargepresetid']
				});

			osmium_add_charge_by_location(m.typeid, m.index, typeid);
		}
	}
};