<?php
/* Osmium
 * Copyright (C) 2012 Romain "Artefact2" Dalmaso <artefact2@gmail.com>
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

const OSMIUM_FIELD_REMEMBER_VALUE = 1;

$__osmium_form_errors = array();

function osmium_prg() {
  $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '__cli';

  if(isset($_POST) && count($_POST) > 0) {
    $_SESSION['__osmium_prg_data'] = array($uri, $_POST);
    session_commit();
    header('HTTP/1.1 303 See Other', true, 303);
    header('Location: '.$uri, true, 303);
    die();
  }

  if(isset($_SESSION['__osmium_prg_data'])) {
    list($from_uri, $prg_data) = $_SESSION['__osmium_prg_data'];
    if($from_uri === $uri) $_POST = $prg_data;

    unset($_SESSION['__osmium_prg_data']);
  }
}

function osmium_form_begin($action = null, $id = '') {
  if($action === null) $action = $_SERVER['REQUEST_URI'];
  if($id !== '') $id = " id='$id'";

  echo "<form method='post' action='$action'$id>\n<table>\n<tbody>\n";
}

function osmium_form_end() {
  echo "</tbody>\n</table>\n</form>\n";
}

function osmium_add_field_error($name, $error) {
  global $__osmium_form_errors;
  $__osmium_form_errors[$name][] = $error;
}

function osmium_generic_field($label, $type, $name, $id = null, $flags = 0) {
  if($id === null) $id = $name;
  if($flags & OSMIUM_FIELD_REMEMBER_VALUE && isset($_POST[$name])) {
    $value = "value='".htmlspecialchars($_POST[$name], ENT_QUOTES)."' ";
  } else $value = '';

  $class = '';

  global $__osmium_form_errors;
  if(isset($__osmium_form_errors[$name]) && count($__osmium_form_errors[$name]) > 0) {
    $class = 'error';
    foreach($__osmium_form_errors[$name] as $msg) {
      echo "<tr class='error_message'>\n<td colspan='2'><p>".htmlspecialchars($msg, ENT_QUOTES)."</p></td>\n</tr>\n";
    }
  }

  if($class !== '') {
    $class = " class='$class' ";
  }

  echo "<tr$class>\n";
  echo "<td><label for='$id'>".htmlspecialchars($label)."</label></td>\n";
  echo "<td><input type='$type' name='$name' id='$id' $value/></td>\n";
  echo "</tr>\n";
}

function osmium_submit($value = '') {
  if($value !== '') {
    $value = "value='".htmlspecialchars($value, ENT_QUOTES)."' ";
  }

  echo "<tr>\n<td></td>\n";
  echo "<td><input type='submit' $value/></td>\n</tr>\n";
}

function osmium_separator() {
  echo "<tr>\n<td colspan='2'><hr /></td>\n</tr>\n";
}

function osmium_text($text) {
  echo "<tr>\n<td colspan='2'>".$text."</td>\n</tr>\n";
}