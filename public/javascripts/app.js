$(document).ready(function() {

  var self = this;

  self.names = {
    mainContentId: 'main-content',
    newTaskInputId: 'new-task-input',

    taskViewTemplateId: 'task-view-template',
    taskListViewTemplateId: 'task-list-view-template',
    projectListViewTemplateId: 'project-list-view-template',

    taskViewClass: 'task-view',
    taskListViewClass: 'task-list-view',
    projectListViewId: 'project-list-view',

    urgentImportantListId: 'urgent-important-list',
    urgentNotImportantListId: 'urgent-not-important-list',
    notUrgentImportantListId: 'not-urgent-important-list',
    notUrgentNotImportantListId: 'not-urgent-not-important-list',

    draggedElementClass: 'currently-dragged-element',
  }


  //=======================================================================
  // Models
  //=======================================================================

  self.Task = Backbone.Model.extend({
    defaults: {
      name: '',
      selected: false,
    },
  });

  self.Project = Backbone.Model.extend({
    defaults: {
      name: ''
    },
  });


  //=======================================================================
  // Colllections
  //=======================================================================

  self.TaskCollection = Backbone.Collection.extend({
    model: self.Task,
  });

  self.ProjectList = Backbone.Collection.extend({
    model: self.Project,
  });


  //=======================================================================
  // Views
  //=======================================================================

  self.TaskView = Backbone.View.extend({
    tagName: 'div',
    className: self.names.taskViewClass,
    events: {
      'drop': 'drop',
    },
    drop: function(e, options) {
      var index = options['index'] || 0;
      var newList = options['list'];
      var oldList = self.app.taskLists[self.app.dragSourceTaskList];
      // Remove the view from the old list.
      oldList.model.remove(this.model);
      // Add the view from the new list.
      newList.model.add(this.model, {at: index});
    },
    template: function(data) {
      return _.template($('#' + self.names.taskViewTemplateId)
                        .html(), data.toJSON());
    },
    render: function(element) {
      this.$el.html(this.template(this.model));
      if (element) {  // Be extra-cautious.
        element.append(this.$el);
      }
      return this;
    },
  });

  self.TaskListView = Backbone.View.extend({
    tagName: 'div',
    className: self.names.taskListViewClass,
    initialize: function(options) {
      this.name = options['name'];

      // Events
      this.listenTo(this.model, 'add', this.render);
    },
    events: {

    },
    template: function(data) {
      return _.template($('#' + self.names.taskListViewTemplateId)
                        .html(), data);
    },
    render: function() {
      var that = this;


      // Append the the right container.
      var id = '';
      if (this.name == self.names.urgentImportantListId) {
        id = self.names.urgentImportantListId;
      } else if (this.name == self.names.urgentNotImportantListId) {
        id = self.names.urgentNotImportantViewId;
      } else if (this.name == self.names.notUrgentImportantListId) {
        id = self.names.notUrgentImportantViewId;
      } else if (this.name == self.names.notUrgentNotImportantListId) {
        id = self.names.notUrgentNotImportantListId;
      }
      var container = $('#' + id);
      container.empty();
      // Do not append this element itself, but do append the subviews.
      // So do NOT do this:
      //
      // container.append(this.$el.html());

      this.model.each(function(task) {
        // Append the subview HTML to this parent view by making the
        // subview append itself when given a handle to the parent view
        // element.
        new self.TaskView({model: task}).render($('#' + id));
      });

      return this;
    },
    addTaskAtIndex: function(task, index) {

    },
  });

  self.ProjectListView = Backbone.View.extend({
    tagName: 'div',
    id: self.names.projectListViewId,
    template: function() {
      return _.template($('#' + self.names.projectListViewTemplateId)
                        .html(), data);
    },
    render: function() {
      this.$el.html(this.template(this.model.attributes));
    },
  });

  //=======================================================================
  // App
  //=======================================================================

  self.App = function() {
    var that = this;
    that.currentView = null;
    that.dropTargetTaskList = null;
    that.dragSourceTaskList = null;

    that.start = function() {
      // Initialize the project list view.
      that.projectListView = new self.ProjectListView({});

      var testTastList = new self.TaskCollection([
        new self.Task({
          name: 'Red task',
          selected: false,
        }),
        new self.Task({
          name: 'Green test task',
          selected: true,
        }),
        new self.Task({
          name: 'Blue test taks with a very long name',
          selected: true,
        }),
      ]);

      // Initialize the task list views.

      // `urgent + important'
      that.urgentImportantView = new self.TaskListView({
        name: self.names.urgentImportantListId,
        model: testTastList,
      });
      that.urgentImportantView.render();
      // `urgent + not important'
      that.urgentNotImportantView = new self.TaskListView({
        name: self.names.urgentNotImportantListId,
        model: new self.TaskCollection([]),
      });
      that.urgentNotImportantView.render();
      // `not urgent + important'
      that.notUrgentImportantView = new self.TaskListView({
        name: self.names.notUrgentImportantListId,
        model: new self.TaskCollection([]),
      });
      // `not urgent + not important'
      that.notUrgentImportantView.render();
      that.notUrgentNotImportantView = new self.TaskListView({
        name: self.names.notUrgentNotImportantListId,
        model: new self.TaskCollection([]),
      });
      that.notUrgentNotImportantView.render();

      // Make the indvidual lists easily referencable.
      that.taskLists = {};
      that.taskLists[self.names.urgentImportantListId] =
        that.urgentImportantView;
      that.taskLists[self.names.urgentNotImportantListId] =
        that.urgentNotImportantView;
      that.taskLists[self.names.notUrgentImportantListId] =
        that.notUrgentImportantView;
      that.taskLists[self.names.notUrgentNotImportantListId] =
        that.notUrgentNotImportantView;

      // Make the input field generate new models.
      $('#' + self.names.newTaskInputId).keypress(function(e) {
        if (e.which == 13) {
          e.preventDefault();
          var newModel = new self.Task({
            name: $(this).val(),
          });
          that.urgentImportantView.model.unshift(newModel);
          $(this).val('');
        }
      });

      try {  // Do not accidentially restart the Backbone history.
        Backbone.history.start();
      } catch(error) {
        // Ignore.
      }
    };

    that.show = function(view) {
      if (that.currentView) {
        that.currentView.close();
      }

      that.currentView = view;
      that.currentView.render();

      $('#' + self.names.mainContentId).html(that.currentView.el);
    };
  };

  self.app = new self.App();
  self.app.start();


  //=======================================================================
  // Drag & Drop
  //=======================================================================

  $('.task-list').sortable({
    connectWith: '.task-list',
    start: function(e, ui) {
      ui.item.addClass(self.names.draggedElementClass);
      var id = $(this).attr('id');
      self.app.dragSourceTaskList = id;
    },
    stop: function(e, ui) {
      ui.item.removeClass(self.names.draggedElementClass);
      var id = $(this).attr('id');
      var index = ui.item.index();
      var list = null;
      var elm = null;
      // If the drop target is the source element itself:
      if (self.app.dropTargetTaskList == null) {
        elm = self.app.dragSourceTaskList;
      } else {
        elm = self.app.dropTargetTaskList;
      }
      list = self.app.taskLists[elm];

      // Drop the element.
      ui.item.trigger('drop', {list: list, index: index});

      // Reset the drop target.
      self.app.dropTargetTaskList = null;
      self.app.dragSourceTaskList = null;
    },
    receive: function(e, ui) {
      self.app.dropTargetTaskList = $(this).attr('id');
    },
  }).disableSelection();

});
